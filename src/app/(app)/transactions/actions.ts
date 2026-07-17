"use server";

import { createClient } from "@/lib/supabase/server";

export type TransactionFilters = {
  spaceId: string | null;
  accountId: string | null;
  categoryIds: string[];
  amountMin: number | null;
  amountMax: number | null;
  dateFrom: string | null;
  dateTo: string | null;
};

export type TransactionRowData = {
  id: string;
  accountId: string;
  categoryId: string | null;
  spaceId: string | null;
  amount: number;
  recipient: string | null;
  description: string;
  occurredAt: string;
  isRecurring: boolean;
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
      "id, account_id, category_id, space_id, amount, recipient, description, occurred_at, is_recurring",
    )
    .order("occurred_at", { ascending: false });

  if (filters.spaceId) query = query.eq("space_id", filters.spaceId);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.categoryIds.length > 0) query = query.in("category_id", filters.categoryIds);
  if (filters.amountMin !== null) query = query.gte("amount", filters.amountMin);
  if (filters.amountMax !== null) query = query.lte("amount", filters.amountMax);
  if (filters.dateFrom) query = query.gte("occurred_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("occurred_at", filters.dateTo);

  const { data, error } = await query;

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
      occurredAt: row.occurred_at,
      isRecurring: row.is_recurring,
    })),
  };
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
