"use server";

import { createClient } from "@/lib/supabase/server";
import { buildOwnAccountSet, isTransferRecipient } from "@/lib/known-recipients";

export type TransactionFilters = {
  spaceId: string | null;
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
  spaceId: string | null;
  amount: number;
  recipient: string | null;
  description: string | null;
  rawDescription: string | null;
  occurredAt: string;
  isRecurring: boolean;
  isTransfer: boolean;
};

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
      "id, account_id, category_id, space_id, amount, recipient, description, raw_description, occurred_at, is_recurring",
    )
    .order("occurred_at", { ascending: false });

  if (filters.spaceId) query = query.eq("space_id", filters.spaceId);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.categoryIds.length > 0) query = query.in("category_id", filters.categoryIds);
  if (filters.amountMin !== null) query = query.gte("amount", filters.amountMin);
  if (filters.amountMax !== null) query = query.lte("amount", filters.amountMax);
  if (filters.dateFrom) query = query.gte("occurred_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("occurred_at", filters.dateTo);
  if (filters.recipient) query = query.ilike("recipient", filters.recipient);

  const [{ data, error }, ownAccountRecipients] = await Promise.all([
    query,
    getOwnAccountSet(supabase, user.id),
  ]);

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    rows: (data ?? []).map((row) => ({
      id: row.id,
      accountId: row.account_id,
      categoryId: row.category_id,
      spaceId: row.space_id,
      amount: row.amount,
      recipient: row.recipient,
      description: row.description,
      rawDescription: row.raw_description,
      occurredAt: row.occurred_at,
      isRecurring: row.is_recurring,
      isTransfer: isTransferRecipient(row.recipient, ownAccountRecipients),
    })),
  };
}

async function getOwnAccountSet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("known_recipients")
    .select("recipient, is_own_account")
    .eq("user_id", userId);
  return buildOwnAccountSet(
    (data ?? []).map((r) => ({ recipient: r.recipient, isOwnAccount: r.is_own_account })),
  );
}

export type KnownRecipientData = { recipient: string; isOwnAccount: boolean };

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
    .select("recipient, is_own_account")
    .eq("user_id", user.id)
    .eq("is_own_account", true)
    .order("recipient", { ascending: true });

  return (data ?? []).map((r) => ({ recipient: r.recipient, isOwnAccount: r.is_own_account }));
}

// Called from the import review step's transfer-detection flag when the
// user answers "should these count toward income/expense?" — no (true,
// excluded) or yes (false, counted normally) — either way, a row is left
// behind so that recipient isn't asked about again on future imports.
// Leaving a recipient unresolved in the review step simply never calls
// this, so it's re-evaluated next import. Unlike Settings' full "unflag"
// below, this never deletes a row.
export async function resolveTransferFlag(
  recipient: string,
  isOwnAccount: boolean,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase
    .from("known_recipients")
    .upsert(
      { user_id: user.id, recipient, is_own_account: isOwnAccount },
      { onConflict: "user_id,recipient" },
    );
  return { success: !error };
}

// Called from Settings — a full reset. Deletes the row entirely, so this
// recipient is eligible to be flagged again by a future import.
export async function unflagKnownRecipient(recipient: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase
    .from("known_recipients")
    .delete()
    .eq("user_id", user.id)
    .eq("recipient", recipient);
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
  updates: { description?: string; categoryId?: string | null; isRecurring?: boolean },
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
      ...(updates.isRecurring !== undefined && { is_recurring: updates.isRecurring }),
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function createCategory(
  name: string,
  color: string,
  icon: string,
): Promise<{ id: string; name: string; color: string; icon: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name, color, icon })
    .select("id, name, color, icon")
    .single();

  if (error || !data) return null;
  return data;
}
