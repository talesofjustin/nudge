"use server";

import { createClient } from "@/lib/supabase/server";
import { buildOwnAccountSet, isTransferRecipient, normalizeRecipient } from "@/lib/known-recipients";
import { identityKey, normalizeIban } from "@/lib/counterparty-identity";
import { upsertUserSettings } from "@/lib/user-settings";
import type { CategoryKind } from "@/lib/supabase/database.types";

export async function dismissBookSuggestion(): Promise<{ success: boolean }> {
  return upsertUserSettings({ bookSuggestionDismissed: true });
}

export type TransactionFilters = {
  bookId: string | null;
  accountId: string | null;
  categoryIds: string[];
  amountMin: number | null;
  amountMax: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  recipient: string | null;
};

export type TransactionRowData = {
  id: string;
  accountId: string;
  categoryId: string | null;
  categorySource: "manual" | "auto" | null;
  reviewedAt: string | null;
  bookId: string | null;
  amount: number;
  recipient: string | null;
  counterpartyIban: string | null;
  description: string | null;
  rawDescription: string | null;
  occurredAt: string;
  hasPreciseTime: boolean;
  isRecurring: boolean;
  recurringTypicalAmount: number | null;
  isRecurringOutlier: boolean;
  isTransfer: boolean;
};

const OUTLIER_THRESHOLD = 0.25;

export async function getFilteredTransactions(
  filters: TransactionFilters,
): Promise<{ success: true; rows: TransactionRowData[] } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  let query = supabase
    .from("transactions")
    .select(
      "id, account_id, category_id, category_source, reviewed_at, book_id, amount, recipient, counterparty_iban, description, raw_description, occurred_at, has_precise_time, is_recurring, recurring_group_id",
    )
    .order("occurred_at", { ascending: false });

  if (filters.bookId) query = query.eq("book_id", filters.bookId);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.categoryIds.length > 0) query = query.in("category_id", filters.categoryIds);
  if (filters.amountMin !== null) query = query.gte("amount", filters.amountMin);
  if (filters.amountMax !== null) query = query.lte("amount", filters.amountMax);
  if (filters.dateFrom) query = query.gte("occurred_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("occurred_at", filters.dateTo);
  if (filters.recipient) query = query.ilike("recipient", filters.recipient);

  const [{ data, error }, ownAccountSet, { data: recurringGroups }] = await Promise.all([
    query,
    getOwnAccountSet(supabase, user.id),
    supabase.from("recurring_groups").select("id, typical_amount").eq("user_id", user.id),
  ]);

  if (error) {
    return { success: false, error: error.message };
  }

  const typicalAmountByGroup = new Map((recurringGroups ?? []).map((g) => [g.id, g.typical_amount]));

  return {
    success: true,
    rows: (data ?? []).map((row) => {
      const typical = row.recurring_group_id ? (typicalAmountByGroup.get(row.recurring_group_id) ?? null) : null;
      const isOutlier =
        typical !== null && typical !== 0 && Math.abs(row.amount - typical) / Math.abs(typical) > OUTLIER_THRESHOLD;
      return {
        id: row.id,
        accountId: row.account_id,
        categoryId: row.category_id,
        categorySource: row.category_source,
        reviewedAt: row.reviewed_at,
        bookId: row.book_id,
        amount: row.amount,
        recipient: row.recipient,
        counterpartyIban: row.counterparty_iban,
        description: row.description,
        rawDescription: row.raw_description,
        occurredAt: row.occurred_at,
        hasPreciseTime: row.has_precise_time,
        isRecurring: row.is_recurring,
        recurringTypicalAmount: typical,
        isRecurringOutlier: isOutlier,
        isTransfer: isTransferRecipient({ recipient: row.recipient, counterpartyIban: row.counterparty_iban }, ownAccountSet),
      };
    }),
  };
}

async function getOwnAccountSet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("known_recipients")
    .select("recipient, counterparty_iban, is_own_account")
    .eq("user_id", userId);
  return buildOwnAccountSet(
    (data ?? []).map((r) => ({ recipient: r.recipient, counterpartyIban: r.counterparty_iban, isOwnAccount: r.is_own_account })),
  );
}

export type KnownRecipientData = { recipient: string; counterpartyIban: string | null; isOwnAccount: boolean };

// Only recipients actively flagged as own-account — the Settings management
// list is "recipients currently treated as transfers", not every recipient
// the user has ever made a decision about.
export async function getKnownRecipients(): Promise<KnownRecipientData[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("known_recipients")
    .select("recipient, counterparty_iban, is_own_account")
    .eq("user_id", user.id)
    .eq("is_own_account", true)
    .order("recipient", { ascending: true });

  return (data ?? []).map((r) => ({
    recipient: r.recipient,
    counterpartyIban: r.counterparty_iban,
    isOwnAccount: r.is_own_account,
  }));
}

// Called from the import review step's transfer-detection flag when the
// user answers "should these count toward income/expense totals?" — no
// (true, excluded) or yes (false, counted normally) — either way, a row is
// left behind so that counterparty isn't asked about again on future
// imports. Leaving one unresolved in the review step simply never calls
// this, so it's re-evaluated next import. Unlike Settings' full "unflag"
// below, this never deletes a row.
export async function resolveTransferFlag(
  recipient: string,
  isOwnAccount: boolean,
  counterpartyIban: string | null = null,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase
    .from("known_recipients")
    .upsert(
      { user_id: user.id, recipient, counterparty_iban: counterpartyIban, is_own_account: isOwnAccount },
      { onConflict: "user_id,identity_key" },
    );
  return { success: !error };
}

// Called from Settings — a full reset. Deletes the row entirely, so this
// counterparty is eligible to be flagged again by a future import.
export async function unflagKnownRecipient(
  recipient: string,
  counterpartyIban: string | null = null,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const key = identityKey({ recipient, counterpartyIban });
  if (!key) return { success: false };

  const { error } = await supabase
    .from("known_recipients")
    .delete()
    .eq("user_id", user.id)
    .eq("identity_key", key);
  return { success: !error };
}

export async function deleteTransactions(ids: string[]): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }
  if (ids.length === 0) return { success: true };

  const { error } = await supabase.from("transactions").delete().in("id", ids).eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function updateTransaction(
  id: string,
  updates: {
    description?: string;
    categoryId?: string | null;
    categorySource?: "manual" | "auto" | null;
    reviewedAt?: string | null;
    isRecurring?: boolean;
    bookId?: string | null;
  },
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.categoryId !== undefined && { category_id: updates.categoryId }),
      ...(updates.categorySource !== undefined && { category_source: updates.categorySource }),
      ...(updates.reviewedAt !== undefined && { reviewed_at: updates.reviewedAt }),
      ...(updates.isRecurring !== undefined && { is_recurring: updates.isRecurring }),
      ...(updates.bookId !== undefined && { book_id: updates.bookId }),
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Bulk equivalent of opening each row's category picker and confirming —
// only clears the "auto, unreviewed" dashed state, never touches the
// category itself.
export async function markTransactionsReviewed(ids: string[]): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || ids.length === 0) return { success: false };

  const { error } = await supabase
    .from("transactions")
    .update({ reviewed_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", user.id);

  return { success: !error };
}

export async function createCategory(
  name: string,
  color: string,
  icon: string,
  kind: CategoryKind = "spending",
): Promise<{ id: string; name: string; color: string; icon: string; kind: CategoryKind } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name, color, icon, kind })
    .select("id, name, color, icon, kind")
    .single();

  if (error || !data) return null;
  return data;
}

export async function updateCategory(
  id: string,
  updates: { name?: string; color?: string; icon?: string; kind?: CategoryKind },
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase.from("categories").update(updates).eq("id", id).eq("user_id", user.id);
  return { success: !error };
}

export async function deleteCategory(id: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase.from("categories").delete().eq("id", id).eq("user_id", user.id);
  return { success: !error };
}

// ---------------------------------------------------------------------------
// Recipient rules — books and categories share the same shape/mechanism:
// a counterparty (IBAN when known, recipient name otherwise) maps to
// exactly one target, always offered as a one-click choice after a manual
// edit, never applied automatically.
// ---------------------------------------------------------------------------

export type RecipientBookRule = { id: string; recipient: string; counterpartyIban: string | null; bookId: string };
export type RecipientCategoryRule = {
  id: string;
  recipient: string;
  counterpartyIban: string | null;
  categoryId: string;
};

export async function getRecipientBookRules(): Promise<RecipientBookRule[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("recipient_book_rules")
    .select("id, recipient, counterparty_iban, book_id")
    .eq("user_id", user.id)
    .order("recipient", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id,
    recipient: r.recipient,
    counterpartyIban: r.counterparty_iban,
    bookId: r.book_id,
  }));
}

export async function setRecipientBookRule(
  recipient: string,
  bookId: string,
  counterpartyIban: string | null = null,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("recipient_book_rules")
    .upsert(
      { user_id: user.id, recipient, counterparty_iban: counterpartyIban, book_id: bookId },
      { onConflict: "user_id,identity_key" },
    );
  return { success: !error };
}

export async function deleteRecipientBookRule(
  recipient: string,
  counterpartyIban: string | null = null,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const key = identityKey({ recipient, counterpartyIban });
  if (!key) return { success: false };

  const { error } = await supabase
    .from("recipient_book_rules")
    .delete()
    .eq("user_id", user.id)
    .eq("identity_key", key);
  return { success: !error };
}

// Explicit, user-triggered only — never run as a side effect of creating a
// rule. Overwrites book_id on every one of the user's transactions matching
// this counterparty (by IBAN when known, recipient name otherwise).
export async function applyBookRuleToExisting(
  recipient: string,
  bookId: string,
  counterpartyIban: string | null = null,
): Promise<{ success: boolean; count: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, count: 0 };

  let query = supabase.from("transactions").update({ book_id: bookId }).eq("user_id", user.id);
  query = counterpartyIban
    ? query.eq("counterparty_iban", normalizeIban(counterpartyIban))
    : query.ilike("recipient", recipient);
  const { data, error } = await query.select("id");

  return { success: !error, count: data?.length ?? 0 };
}

export async function countTransactionsForRecipient(
  recipient: string,
  counterpartyIban: string | null = null,
): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  let query = supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  query = counterpartyIban
    ? query.eq("counterparty_iban", normalizeIban(counterpartyIban))
    : query.ilike("recipient", recipient);
  const { count } = await query;

  return count ?? 0;
}

export async function getRecipientCategoryRules(): Promise<RecipientCategoryRule[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("recipient_category_rules")
    .select("id, recipient, counterparty_iban, category_id")
    .eq("user_id", user.id)
    .order("recipient", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id,
    recipient: r.recipient,
    counterpartyIban: r.counterparty_iban,
    categoryId: r.category_id,
  }));
}

export async function setRecipientCategoryRule(
  recipient: string,
  categoryId: string,
  counterpartyIban: string | null = null,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("recipient_category_rules")
    .upsert(
      { user_id: user.id, recipient, counterparty_iban: counterpartyIban, category_id: categoryId },
      { onConflict: "user_id,identity_key" },
    );
  return { success: !error };
}

export async function deleteRecipientCategoryRule(
  recipient: string,
  counterpartyIban: string | null = null,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const key = identityKey({ recipient, counterpartyIban });
  if (!key) return { success: false };

  const { error } = await supabase
    .from("recipient_category_rules")
    .delete()
    .eq("user_id", user.id)
    .eq("identity_key", key);
  return { success: !error };
}

export async function applyCategoryRuleToExisting(
  recipient: string,
  categoryId: string,
  counterpartyIban: string | null = null,
): Promise<{ success: boolean; count: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, count: 0 };

  let query = supabase
    .from("transactions")
    .update({ category_id: categoryId, category_source: "manual", reviewed_at: new Date().toISOString() })
    .eq("user_id", user.id);
  query = counterpartyIban
    ? query.eq("counterparty_iban", normalizeIban(counterpartyIban))
    : query.ilike("recipient", recipient);
  const { data, error } = await query.select("id");

  return { success: !error, count: data?.length ?? 0 };
}

// ---------------------------------------------------------------------------
// Unified rules — "known recipients" (transfer flags), recipient->book, and
// recipient->category rules are presented as one list in Settings; the
// underlying tables stay separate since they're shaped differently and
// queried from different places (import checks, resolution chains).
// ---------------------------------------------------------------------------

export type UnifiedRule = {
  id: string;
  recipient: string;
  counterpartyIban: string | null;
  kind: "transfer" | "book" | "category";
  targetId: string | null; // book id or category id; null for transfer rules
};

export async function getAllRules(): Promise<UnifiedRule[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: transfers }, { data: bookRules }, { data: categoryRules }] = await Promise.all([
    supabase
      .from("known_recipients")
      .select("id, recipient, counterparty_iban")
      .eq("user_id", user.id)
      .eq("is_own_account", true),
    supabase.from("recipient_book_rules").select("id, recipient, counterparty_iban, book_id").eq("user_id", user.id),
    supabase
      .from("recipient_category_rules")
      .select("id, recipient, counterparty_iban, category_id")
      .eq("user_id", user.id),
  ]);

  const rules: UnifiedRule[] = [
    ...(transfers ?? []).map((r) => ({
      id: r.id,
      recipient: r.recipient,
      counterpartyIban: r.counterparty_iban,
      kind: "transfer" as const,
      targetId: null,
    })),
    ...(bookRules ?? []).map((r) => ({
      id: r.id,
      recipient: r.recipient,
      counterpartyIban: r.counterparty_iban,
      kind: "book" as const,
      targetId: r.book_id,
    })),
    ...(categoryRules ?? []).map((r) => ({
      id: r.id,
      recipient: r.recipient,
      counterpartyIban: r.counterparty_iban,
      kind: "category" as const,
      targetId: r.category_id,
    })),
  ];

  return rules.sort((a, b) => a.recipient.localeCompare(b.recipient));
}

// ---------------------------------------------------------------------------
// Duplicate cleanup — exact-match duplicates within an account left over
// from before row-level import dedup existed. Time-aware when both copies
// have a precise time (dropping description, the least reliable field);
// falls back to date + amount + recipient + description otherwise.
// ---------------------------------------------------------------------------

export type DuplicateTransaction = {
  id: string;
  createdAt: string;
  occurredAt: string;
  hasPreciseTime: boolean;
  recipient: string | null;
  amount: number;
  description: string | null;
  rawDescription: string | null;
};

export type DuplicateGroup = {
  key: string;
  accountId: string;
  matchedOn: "date-time" | "date-description";
  transactions: DuplicateTransaction[];
};

export async function getDuplicateGroups(): Promise<DuplicateGroup[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("transactions")
    .select(
      "id, account_id, occurred_at, has_precise_time, amount, recipient, counterparty_iban, description, raw_description, created_at",
    )
    .eq("user_id", user.id);

  if (!data) return [];

  const groups = new Map<string, DuplicateGroup>();
  for (const tx of data) {
    const matchedOn: "date-time" | "date-description" = tx.has_precise_time ? "date-time" : "date-description";
    const counterparty = identityKey({ recipient: tx.recipient, counterpartyIban: tx.counterparty_iban }) ?? "";
    const key = tx.has_precise_time
      ? [tx.account_id, tx.occurred_at, tx.amount, counterparty].join("|")
      : [
          tx.account_id,
          tx.occurred_at.slice(0, 10),
          tx.amount,
          counterparty,
          (tx.description ?? "").trim().toLowerCase(),
        ].join("|");

    const entry: DuplicateTransaction = {
      id: tx.id,
      createdAt: tx.created_at,
      occurredAt: tx.occurred_at,
      hasPreciseTime: tx.has_precise_time,
      recipient: tx.recipient,
      amount: tx.amount,
      description: tx.description,
      rawDescription: tx.raw_description,
    };

    const existing = groups.get(key);
    if (existing) {
      existing.transactions.push(entry);
    } else {
      groups.set(key, { key, accountId: tx.account_id, matchedOn, transactions: [entry] });
    }
  }

  return Array.from(groups.values()).filter((g) => g.transactions.length > 1);
}

export { normalizeRecipient };
