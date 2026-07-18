"use server";

import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/lib/supabase/database.types";
import { IMPORT_CHECKS, type ImportFlag } from "@/lib/import-checks";

export type ImportRow = {
  date: string;
  amount: number;
  recipient: string | null;
  description: string | null;
};

// Resolves the account choice to a real (existing) account id without
// creating anything yet — used by the review step, which runs before the
// user has committed to the import. A brand-new account has no history to
// check against, so checks simply see `accountId: null` in that case.
async function resolveExistingAccountId(account: AccountChoice): Promise<string | null> {
  if (account.kind === "existing") return account.id;
  return null;
}

export async function runImportChecks(
  account: AccountChoice,
  rows: ImportRow[],
): Promise<{ flags: ImportFlag[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { flags: [] };

  const accountId = await resolveExistingAccountId(account);
  const ctx = { rows, accountId, userId: user.id };

  const results = await Promise.all(IMPORT_CHECKS.map((check) => check.run(ctx)));
  return { flags: results.flat() };
}

export type AccountChoice =
  | { kind: "existing"; id: string }
  | { kind: "new"; name: string; type: AccountType };

export type SpaceChoice =
  | { kind: "existing"; id: string }
  | { kind: "new"; name: string }
  | { kind: "none" };

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

export async function importTransactions(
  account: AccountChoice,
  space: SpaceChoice,
  rows: ImportRow[],
  filename: string | null,
  skippedCount: number,
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be logged in to import transactions." };
  }

  if (rows.length === 0) {
    return { success: false, error: "No valid rows to import." };
  }

  let accountId: string;
  let accountName: string;

  if (account.kind === "existing") {
    const { data, error } = await supabase
      .from("accounts")
      .select("id, name")
      .eq("id", account.id)
      .single();
    if (error || !data) {
      return { success: false, error: "That account could not be found." };
    }
    accountId = data.id;
    accountName = data.name;
  } else {
    if (!account.name.trim()) {
      return { success: false, error: "Account name is required." };
    }
    const { data, error } = await supabase
      .from("accounts")
      .insert({ user_id: user.id, name: account.name.trim(), type: account.type })
      .select("id, name")
      .single();
    if (error || !data) {
      return { success: false, error: "Could not create the new account." };
    }
    accountId = data.id;
    accountName = data.name;
  }

  let spaceId: string | null = null;

  if (space.kind === "existing") {
    const { data, error } = await supabase
      .from("spaces")
      .select("id")
      .eq("id", space.id)
      .single();
    if (error || !data) {
      return { success: false, error: "That space could not be found." };
    }
    spaceId = data.id;
  } else if (space.kind === "new") {
    if (!space.name.trim()) {
      return { success: false, error: "Space name is required." };
    }
    const { data, error } = await supabase
      .from("spaces")
      .insert({ user_id: user.id, name: space.name.trim() })
      .select("id")
      .single();
    if (error || !data) {
      return { success: false, error: "Could not create the new space." };
    }
    spaceId = data.id;
  }

  const { error: insertError } = await supabase.from("transactions").insert(
    rows.map((row) => ({
      user_id: user.id,
      account_id: accountId,
      space_id: spaceId,
      category_id: null,
      amount: row.amount,
      recipient: row.recipient,
      raw_description: row.description,
      occurred_at: row.date,
      is_recurring: false,
    })),
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
    space_id: spaceId,
    filename,
    row_count: rows.length,
    skipped_count: skippedCount,
    statement_start_date: statementStartDate,
    statement_end_date: statementEndDate,
  });

  return {
    success: true,
    count: rows.length,
    accountName,
    skippedCount,
    statementStartDate,
    statementEndDate,
  };
}
