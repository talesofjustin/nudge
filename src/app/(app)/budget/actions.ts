"use server";

import { createClient } from "@/lib/supabase/server";
import { buildOwnAccountSet, isTransferRecipient } from "@/lib/known-recipients";
import { financialMonthBudgetKey, shiftFinancialMonth } from "@/lib/financial-month";
import { getUserSettings, upsertUserSettings } from "@/lib/user-settings";
import type { CategoryKind } from "@/lib/supabase/database.types";

export type CategoryProgressData = {
  categoryId: string;
  spent: number;
  budgeted: number | null;
};

export type BudgetProgressResult = {
  rows: CategoryProgressData[];
  totalBudgeted: number;
  totalSpent: number;
  // Sum of spend in 'saving' categories — money that's still the user's,
  // so it's tracked separately rather than folded into totalSpent.
  totalSaved: number;
  // Transactions in this period with no resolvable book — excluded from
  // the totals above so a specific book's numbers are never silently
  // missing spend. Always 0 when no book is selected (book_id === null),
  // since there's nothing to exclude by.
  unassignedCount: number;
};

// Spend excludes transfers (flagged recipients) and uncategorized rows (the
// existing "categorize before it counts" rule), and only counts expenses —
// income landing in a category (e.g. Salary) isn't "spend" against a
// budget. `bookId` null means "no book selected" (global budget, used by
// accounts with zero/one book) — everything counts, book_id isn't
// filtered at all. A specific bookId scopes spend to exactly that book.
export async function getBudgetProgress(
  from: string,
  to: string,
  bookId: string | null,
): Promise<BudgetProgressResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { rows: [], totalBudgeted: 0, totalSpent: 0, totalSaved: 0, unassignedCount: 0 };

  const monthKey = financialMonthBudgetKey(from);

  let txQuery = supabase
    .from("transactions")
    .select("category_id, amount, recipient, counterparty_iban, book_id")
    .eq("user_id", user.id)
    .gte("occurred_at", from)
    .lte("occurred_at", `${to}T23:59:59`);
  if (bookId) txQuery = txQuery.eq("book_id", bookId);

  let budgetQuery = supabase
    .from("budgets")
    .select("category_id, amount")
    .eq("user_id", user.id)
    .eq("month", monthKey);
  budgetQuery = bookId ? budgetQuery.eq("book_id", bookId) : budgetQuery.is("book_id", null);

  const [{ data: txs }, { data: budgetRows }, { data: known }, { data: categories }] = await Promise.all([
    txQuery,
    budgetQuery,
    supabase.from("known_recipients").select("recipient, counterparty_iban, is_own_account").eq("user_id", user.id),
    supabase.from("categories").select("id, kind").eq("user_id", user.id),
  ]);

  const ownAccountSet = buildOwnAccountSet(
    (known ?? []).map((r) => ({ recipient: r.recipient, counterpartyIban: r.counterparty_iban, isOwnAccount: r.is_own_account })),
  );
  const kindByCategory = new Map((categories ?? []).map((c) => [c.id, c.kind as CategoryKind]));

  const spentByCategory = new Map<string, number>();
  let unassignedCount = 0;
  for (const tx of txs ?? []) {
    if (bookId && !tx.book_id) unassignedCount++;
    if (!tx.category_id) continue;
    if (tx.amount >= 0) continue;
    if (isTransferRecipient({ recipient: tx.recipient, counterpartyIban: tx.counterparty_iban }, ownAccountSet)) continue;
    spentByCategory.set(tx.category_id, (spentByCategory.get(tx.category_id) ?? 0) + Math.abs(tx.amount));
  }

  const budgetByCategory = new Map<string, number>();
  for (const b of budgetRows ?? []) {
    budgetByCategory.set(b.category_id, b.amount);
  }

  const categoryIds = new Set([...spentByCategory.keys(), ...budgetByCategory.keys()]);
  const rows: CategoryProgressData[] = Array.from(categoryIds).map((categoryId) => ({
    categoryId,
    spent: spentByCategory.get(categoryId) ?? 0,
    budgeted: budgetByCategory.get(categoryId) ?? null,
  }));

  let totalBudgeted = 0;
  let totalSpent = 0;
  let totalSaved = 0;
  for (const row of rows) {
    if (kindByCategory.get(row.categoryId) === "saving") {
      totalSaved += row.spent;
    } else {
      totalBudgeted += row.budgeted ?? 0;
      totalSpent += row.spent;
    }
  }

  return { rows, totalBudgeted, totalSpent, totalSaved, unassignedCount };
}

export type CategorySuggestion = {
  categoryId: string;
  average: number;
  monthsUsed: number;
};

// Averages spend over the up-to-3 financial months immediately preceding
// the given one, scoped to the same book. "monthsUsed" reflects how many
// of those months the account actually has any transaction history for
// (not just this category), so a brand-new account doesn't get a
// misleadingly confident "avg last 3 months" built mostly from zeros.
export async function getBudgetSuggestions(
  currentFrom: string,
  currentTo: string,
  bookId: string | null,
): Promise<CategorySuggestion[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const settings = await getUserSettings();
  const anchor = settings.paydayAnchorDay;

  const priorMonths: { from: string; to: string }[] = [];
  let cursor = { from: currentFrom, to: currentTo };
  for (let i = 0; i < 3; i++) {
    cursor = shiftFinancialMonth(cursor, anchor, "prev");
    priorMonths.push(cursor);
  }

  const earliestFrom = priorMonths[priorMonths.length - 1].from;
  const latestTo = priorMonths[0].to;

  let txQuery = supabase
    .from("transactions")
    .select("category_id, amount, occurred_at, recipient, counterparty_iban")
    .eq("user_id", user.id)
    .gte("occurred_at", earliestFrom)
    .lte("occurred_at", `${latestTo}T23:59:59`);
  if (bookId) txQuery = txQuery.eq("book_id", bookId);

  const [{ data: txs }, { data: known }] = await Promise.all([
    txQuery,
    supabase.from("known_recipients").select("recipient, counterparty_iban, is_own_account").eq("user_id", user.id),
  ]);

  const ownAccountSet = buildOwnAccountSet(
    (known ?? []).map((r) => ({ recipient: r.recipient, counterpartyIban: r.counterparty_iban, isOwnAccount: r.is_own_account })),
  );

  const monthHasData = priorMonths.map(() => false);
  const perCategory = new Map<string, [number, number, number]>();

  for (const tx of txs ?? []) {
    const date = tx.occurred_at.slice(0, 10);
    const monthIndex = priorMonths.findIndex((m) => date >= m.from && date <= m.to);
    if (monthIndex === -1) continue;
    monthHasData[monthIndex] = true;

    if (!tx.category_id || tx.amount >= 0) continue;
    if (isTransferRecipient({ recipient: tx.recipient, counterpartyIban: tx.counterparty_iban }, ownAccountSet)) continue;

    const amounts = perCategory.get(tx.category_id) ?? [0, 0, 0];
    amounts[monthIndex] += Math.abs(tx.amount);
    perCategory.set(tx.category_id, amounts);
  }

  const monthsUsed = monthHasData.filter(Boolean).length;
  if (monthsUsed === 0) return [];

  return Array.from(perCategory.entries()).map(([categoryId, amounts]) => ({
    categoryId,
    average: amounts.reduce((a, b) => a + b, 0) / monthsUsed,
    monthsUsed,
  }));
}

// Plain upsert can't rely on ON CONFLICT here: Postgres treats every NULL
// book_id as distinct, so two "global" budget rows for the same category+
// month wouldn't collide via a unique constraint. A select-then-write
// avoids that pitfall entirely regardless of whether bookId is set.
async function findBudgetId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  bookId: string | null,
  categoryId: string,
  monthKey: string,
): Promise<string | null> {
  let query = supabase
    .from("budgets")
    .select("id")
    .eq("user_id", userId)
    .eq("category_id", categoryId)
    .eq("month", monthKey);
  query = bookId ? query.eq("book_id", bookId) : query.is("book_id", null);
  const { data } = await query.maybeSingle();
  return data?.id ?? null;
}

export async function upsertBudget(
  monthKey: string,
  categoryId: string,
  amount: number,
  bookId: string | null,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const existingId = await findBudgetId(supabase, user.id, bookId, categoryId, monthKey);

  const { error } = existingId
    ? await supabase.from("budgets").update({ amount }).eq("id", existingId)
    : await supabase
        .from("budgets")
        .insert({ user_id: user.id, book_id: bookId, category_id: categoryId, month: monthKey, amount });

  return { success: !error };
}

export async function deleteBudget(
  monthKey: string,
  categoryId: string,
  bookId: string | null,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  let query = supabase
    .from("budgets")
    .delete()
    .eq("user_id", user.id)
    .eq("category_id", categoryId)
    .eq("month", monthKey);
  query = bookId ? query.eq("book_id", bookId) : query.is("book_id", null);

  const { error } = await query;
  return { success: !error };
}

export async function copyLastMonthBudgets(
  currentFrom: string,
  currentTo: string,
  bookId: string | null,
): Promise<{ success: boolean; count: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, count: 0 };

  const settings = await getUserSettings();
  const prevMonth = shiftFinancialMonth({ from: currentFrom, to: currentTo }, settings.paydayAnchorDay, "prev");
  const prevMonthKey = financialMonthBudgetKey(prevMonth.from);
  const currentMonthKey = financialMonthBudgetKey(currentFrom);

  let prevQuery = supabase
    .from("budgets")
    .select("category_id, amount")
    .eq("user_id", user.id)
    .eq("month", prevMonthKey);
  prevQuery = bookId ? prevQuery.eq("book_id", bookId) : prevQuery.is("book_id", null);
  const { data: prevBudgets } = await prevQuery;

  if (!prevBudgets || prevBudgets.length === 0) {
    return { success: true, count: 0 };
  }

  let failed = false;
  for (const b of prevBudgets) {
    const res = await upsertBudget(currentMonthKey, b.category_id, b.amount, bookId);
    if (!res.success) failed = true;
  }
  void currentMonthKey;

  return { success: !failed, count: prevBudgets.length };
}

export async function dismissBudgetTip(): Promise<{ success: boolean }> {
  return upsertUserSettings({ budgetTipDismissed: true });
}
