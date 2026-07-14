"use server";

import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/lib/supabase/database.types";

export type ImportRow = {
  date: string;
  amount: number;
  recipient: string | null;
  description: string | null;
};

export type AccountChoice =
  | { kind: "existing"; id: string }
  | { kind: "new"; name: string; type: AccountType };

export type SpaceChoice =
  | { kind: "existing"; id: string }
  | { kind: "new"; name: string }
  | { kind: "none" };

export type ImportResult =
  | { success: true; count: number; accountName: string }
  | { success: false; error: string };

export async function importTransactions(
  account: AccountChoice,
  space: SpaceChoice,
  rows: ImportRow[],
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
      description: row.description ?? "",
      occurred_at: row.date,
      is_recurring: false,
    })),
  );

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true, count: rows.length, accountName };
}
