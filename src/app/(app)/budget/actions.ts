"use server";

import { createClient } from "@/lib/supabase/server";
import { buildOwnAccountSet, isTransferRecipient } from "@/lib/known-recipients";
import { financialMonthBudgetKey, shiftFinancialMonth } from "@/lib/financial-month";
import { getUserSettings, upsertUserSettings } from "@/lib/user-settings";

export type CategoryProgressData = {
  categoryId: string;
  spent: number;
  budgeted: number | null;
};

export type BudgetProgressResult = {
  rows: CategoryProgressData[];
  totalBudgeted: number;
  totalSpent: number;
};

// Spend excludes transfers (flagged recipients) and uncategorized rows (the
// existing "categorize before it counts" rule), and only counts expenses —
// income landing in a category (e.g. Salary) isn't "spend" against a budget.
export async function getBudgetProgress(from: string, to: string): Promise<BudgetProgressResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { rows: [], totalBudgeted: 0, totalSpent: 0 };

  const monthKey = financialMonthBudgetKey(from);

  const [{ data: txs }, { data: budgetRows }, { data: known }] = await Promise.all([
    supabase
      .from("transactions")
      .select("category_id, amount, recipient")
      .eq("user_id", user.id)
      .gte("occurred_at", from)
      .lte("occurred_at", `${to}T23:59:59`),
    supabase.from("budgets").select("category_id, amount").eq("user_id", user.id).eq("month", monthKey),
    supabase.from("known_recipients").select("recipient, is_own_account").eq("user_id", user.id),
  ]);

  const ownAccountSet = buildOwnAccountSet(
    (known ?? []).map((r) => ({ recipient: r.recipient, isOwnAccount: r.is_own_account })),
  );

  const spentByCategory = new Map<string, number>();
  for (const tx of txs ?? []) {
    if (!tx.category_id) continue;
    if (tx.amount >= 0) continue;
    if (isTransferRecipient(tx.recipient, ownAccountSet)) continue;
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

  const totalBudgeted = rows.reduce((sum, r) => sum + (r.budgeted ?? 0), 0);
  const totalSpent = rows.reduce((sum, r) => sum + r.spent, 0);

  return { rows, totalBudgeted, totalSpent };
}

export type CategorySuggestion = {
  categoryId: string;
  average: number;
  monthsUsed: number;
};

// Averages spend over the up-to-3 financial months immediately preceding
// the given one. "monthsUsed" reflects how many of those months the
// account actually has any transaction history for (not just this
// category), so a brand-new account doesn't get a misleadingly confident
// "avg last 3 months" built mostly from zeros.
export async function getBudgetSuggestions(
  currentFrom: string,
  currentTo: string,
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

  const [{ data: txs }, { data: known }] = await Promise.all([
    supabase
      .from("transactions")
      .select("category_id, amount, occurred_at, recipient")
      .eq("user_id", user.id)
      .gte("occurred_at", earliestFrom)
      .lte("occurred_at", `${latestTo}T23:59:59`),
    supabase.from("known_recipients").select("recipient, is_own_account").eq("user_id", user.id),
  ]);

  const ownAccountSet = buildOwnAccountSet(
    (known ?? []).map((r) => ({ recipient: r.recipient, isOwnAccount: r.is_own_account })),
  );

  const monthHasData = priorMonths.map(() => false);
  const perCategory = new Map<string, [number, number, number]>();

  for (const tx of txs ?? []) {
    const date = tx.occurred_at.slice(0, 10);
    const monthIndex = priorMonths.findIndex((m) => date >= m.from && date <= m.to);
    if (monthIndex === -1) continue;
    monthHasData[monthIndex] = true;

    if (!tx.category_id || tx.amount >= 0) continue;
    if (isTransferRecipient(tx.recipient, ownAccountSet)) continue;

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

export async function upsertBudget(
  monthKey: string,
  categoryId: string,
  amount: number,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, category_id: categoryId, month: monthKey, amount },
      { onConflict: "user_id,category_id,month" },
    );

  return { success: !error };
}

export async function deleteBudget(
  monthKey: string,
  categoryId: string,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("user_id", user.id)
    .eq("category_id", categoryId)
    .eq("month", monthKey);

  return { success: !error };
}

export async function copyLastMonthBudgets(
  currentFrom: string,
  currentTo: string,
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

  const { data: prevBudgets } = await supabase
    .from("budgets")
    .select("category_id, amount")
    .eq("user_id", user.id)
    .eq("month", prevMonthKey);

  if (!prevBudgets || prevBudgets.length === 0) {
    return { success: true, count: 0 };
  }

  const { error } = await supabase.from("budgets").upsert(
    prevBudgets.map((b) => ({
      user_id: user.id,
      category_id: b.category_id,
      month: currentMonthKey,
      amount: b.amount,
    })),
    { onConflict: "user_id,category_id,month" },
  );

  return { success: !error, count: prevBudgets.length };
}

export async function dismissBudgetTip(): Promise<{ success: boolean }> {
  return upsertUserSettings({ budgetTipDismissed: true });
}
