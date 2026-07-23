"use server";

import { createClient } from "@/lib/supabase/server";
import type { AccountType, SavedColumnMapping } from "@/lib/supabase/database.types";
import { IMPORT_CHECKS, type ImportFlag } from "@/lib/import-checks";
import { identityKey, transactionMatchKey } from "@/lib/counterparty-identity";
import { buildRecipientBookRuleMap, buildRecipientCategoryRuleMap, resolveBookId } from "@/lib/book-resolution";
import { recomputeRecurringGroups } from "@/lib/recurring";

export type ImportRow = {
  date: string;
  amount: number;
  recipient: string | null;
  description: string | null;
  counterpartyIban: string | null;
  hasPreciseTime: boolean;
};

export type ImportAccountOption = {
  id: string;
  name: string;
  type: AccountType;
  columnMapping: SavedColumnMapping | null;
};

// Account selection is the first step now — a plain list, no inline
// creation (that lives in Settings' Add Account dialog).
export async function getImportAccounts(): Promise<ImportAccountOption[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("accounts")
    .select("id, name, type, column_mapping")
    .order("created_at", { ascending: true });

  return (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    columnMapping: a.column_mapping,
  }));
}

export async function saveColumnMapping(
  accountId: string,
  mapping: SavedColumnMapping,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("accounts")
    .update({ column_mapping: mapping })
    .eq("id", accountId)
    .eq("user_id", user.id);

  return { success: !error };
}

function rowKey(row: {
  date: string;
  amount: number;
  recipient: string | null;
  counterpartyIban?: string | null;
  hasPreciseTime: boolean;
}): string {
  return transactionMatchKey({
    occurredAt: row.date,
    hasPreciseTime: row.hasPreciseTime,
    amount: row.amount,
    recipient: row.recipient,
    counterpartyIban: row.counterpartyIban,
  });
}

export type RowPreview = {
  isDuplicate: boolean;
  resolvedCategoryId: string | null;
  resolvedCategoryName: string | null;
};

// Row-level dedup (against this account's existing transactions) plus a
// preview of which category a row would be auto-assigned from an existing
// recipient rule, so the review table can show a subtle "auto" indicator
// before anything is actually imported.
export async function previewImportRows(
  accountId: string,
  rows: ImportRow[],
): Promise<RowPreview[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || rows.length === 0) return rows.map(() => ({ isDuplicate: false, resolvedCategoryId: null, resolvedCategoryName: null }));

  const dates = rows.map((r) => r.date.slice(0, 10)).sort();

  const [{ data: existing }, { data: rules }, { data: categories }] = await Promise.all([
    supabase
      .from("transactions")
      .select("occurred_at, amount, recipient, counterparty_iban, has_precise_time")
      .eq("account_id", accountId)
      .eq("user_id", user.id)
      .gte("occurred_at", dates[0])
      .lte("occurred_at", `${dates[dates.length - 1]}T23:59:59`),
    supabase.from("recipient_category_rules").select("recipient, counterparty_iban, category_id").eq("user_id", user.id),
    supabase.from("categories").select("id, name").eq("user_id", user.id),
  ]);

  const existingKeys = new Set(
    (existing ?? []).map((t) =>
      rowKey({
        date: t.occurred_at,
        amount: t.amount,
        recipient: t.recipient,
        counterpartyIban: t.counterparty_iban,
        hasPreciseTime: t.has_precise_time,
      }),
    ),
  );
  const ruleMap = buildRecipientCategoryRuleMap(
    (rules ?? []).map((r) => ({ recipient: r.recipient, counterpartyIban: r.counterparty_iban, categoryId: r.category_id })),
  );
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return rows.map((row) => {
    const key = identityKey({ recipient: row.recipient, counterpartyIban: row.counterpartyIban });
    const resolvedCategoryId = key ? (ruleMap.get(key) ?? null) : null;
    return {
      isDuplicate: existingKeys.has(rowKey(row)),
      resolvedCategoryId,
      resolvedCategoryName: resolvedCategoryId ? (categoryNameById.get(resolvedCategoryId) ?? null) : null,
    };
  });
}

export async function runImportChecks(
  accountId: string,
  rows: ImportRow[],
): Promise<{ flags: ImportFlag[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { flags: [] };

  const ctx = { rows, accountId, userId: user.id };
  const results = await Promise.all(IMPORT_CHECKS.map((check) => check.run(ctx)));
  return { flags: results.flat() };
}

export type ImportResult =
  | {
      success: true;
      count: number;
      accountName: string;
      skippedCount: number;
      statementStartDate: string | null;
      statementEndDate: string | null;
    }
  | { success: false; error: string };

// `bookOverrides` carries per-recipient answers from the review step's
// book-assignment flag (normalized recipient -> book id) — these apply to
// this import only; whether they also become a permanent rule is a
// separate, explicit "remember this" action the review step triggers
// itself before calling this.
export async function importTransactions(
  accountId: string,
  rows: ImportRow[],
  filename: string | null,
  skippedCount: number,
  bookOverrides: Record<string, string>,
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to import transactions." };
  }
  if (rows.length === 0) {
    return { success: false, error: "No transactions selected to import." };
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, name, default_book_id")
    .eq("id", accountId)
    .single();
  if (accountError || !account) {
    return { success: false, error: "That account could not be found." };
  }

  const [{ data: bookRules }, { data: categoryRules }] = await Promise.all([
    supabase.from("recipient_book_rules").select("recipient, counterparty_iban, book_id").eq("user_id", user.id),
    supabase.from("recipient_category_rules").select("recipient, counterparty_iban, category_id").eq("user_id", user.id),
  ]);
  const bookRuleMap = buildRecipientBookRuleMap(
    (bookRules ?? []).map((r) => ({ recipient: r.recipient, counterpartyIban: r.counterparty_iban, bookId: r.book_id })),
  );
  const categoryRuleMap = buildRecipientCategoryRuleMap(
    (categoryRules ?? []).map((r) => ({ recipient: r.recipient, counterpartyIban: r.counterparty_iban, categoryId: r.category_id })),
  );

  const { error: insertError } = await supabase.from("transactions").insert(
    rows.map((row) => {
      const counterparty = { recipient: row.recipient, counterpartyIban: row.counterpartyIban };
      const key = identityKey(counterparty);
      const overrideBook = key ? bookOverrides[key] : undefined;
      const resolvedBook = resolveBookId({
        transactionBookId: overrideBook ?? null,
        counterparty,
        accountDefaultBookId: account.default_book_id,
        recipientRules: bookRuleMap,
      });
      const resolvedCategory = key ? (categoryRuleMap.get(key) ?? null) : null;
      return {
        user_id: user.id,
        account_id: accountId,
        book_id: resolvedBook,
        category_id: resolvedCategory,
        category_source: resolvedCategory ? ("auto" as const) : null,
        reviewed_at: null,
        amount: row.amount,
        recipient: row.recipient,
        counterparty_iban: row.counterpartyIban,
        description: row.description,
        raw_description: row.description,
        occurred_at: row.date,
        has_precise_time: row.hasPreciseTime,
        is_recurring: false,
      };
    }),
  );

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  const dates = rows.map((r) => r.date).sort();
  const statementStartDate = dates[0]?.slice(0, 10) ?? null;
  const statementEndDate = dates[dates.length - 1]?.slice(0, 10) ?? null;

  // Best-effort history log — the transactions themselves already landed
  // successfully above, so a failure here shouldn't fail the whole import.
  await supabase.from("imports").insert({
    user_id: user.id,
    account_id: accountId,
    book_id: account.default_book_id,
    filename,
    row_count: rows.length,
    skipped_count: skippedCount,
    statement_start_date: statementStartDate,
    statement_end_date: statementEndDate,
  });

  // Best-effort: new rows can extend or newly reveal a recurring pattern,
  // so groups are recomputed after every import. Never blocks the import
  // itself from succeeding.
  await recomputeRecurringGroups(user.id);

  return {
    success: true,
    count: rows.length,
    accountName: account.name,
    skippedCount,
    statementStartDate,
    statementEndDate,
  };
}

// Removes a stale import history entry (e.g. after the transactions it
// logged were deleted separately) — does not touch any transactions.
export async function deleteImportHistoryEntry(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  const { error } = await supabase.from("imports").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
