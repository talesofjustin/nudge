"use server";

import { createClient } from "@/lib/supabase/server";

export type TransactionSplitData = {
  id: string;
  categoryId: string | null;
  bookId: string | null;
  amount: number;
  note: string | null;
};

export type SplitInput = {
  categoryId: string | null;
  bookId: string | null;
  amount: number;
  note: string | null;
};

export type SaveSplitsResult =
  | { success: true; splits: TransactionSplitData[] }
  | { success: false; error: string };

// Replaces every split on a transaction in one call — the editor always
// saves its full current draft rather than diffing individual line
// changes, so delete-then-insert is simpler and no split ever gets
// silently missed. Amounts must sum to exactly the parent transaction's
// amount; the UI already blocks Save until balanced, but this re-checks
// server-side since that check is bypassable.
export async function saveTransactionSplits(
  transactionId: string,
  splits: SplitInput[],
): Promise<SaveSplitsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be logged in." };

  if (splits.length === 0) {
    return unsplitTransaction(transactionId);
  }

  const { data: tx } = await supabase
    .from("transactions")
    .select("id, amount")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .single();
  if (!tx) return { success: false, error: "Transaction not found." };

  const total = splits.reduce((sum, s) => sum + s.amount, 0);
  // Cent-level floating point tolerance — amounts are summed in JS on
  // both client and server.
  if (Math.abs(total - tx.amount) > 0.005) {
    return { success: false, error: "Split amounts must add up to the transaction's total." };
  }

  const { error: deleteError } = await supabase
    .from("transaction_splits")
    .delete()
    .eq("transaction_id", transactionId)
    .eq("user_id", user.id);
  if (deleteError) return { success: false, error: deleteError.message };

  const { data: inserted, error: insertError } = await supabase
    .from("transaction_splits")
    .insert(
      splits.map((s, i) => ({
        transaction_id: transactionId,
        user_id: user.id,
        category_id: s.categoryId,
        book_id: s.bookId,
        amount: s.amount,
        note: s.note,
        sort_order: i,
      })),
    )
    .select("id, category_id, book_id, amount, note")
    .order("sort_order", { ascending: true });
  if (insertError) return { success: false, error: insertError.message };

  return {
    success: true,
    splits: (inserted ?? []).map((s) => ({
      id: s.id,
      categoryId: s.category_id,
      bookId: s.book_id,
      amount: s.amount,
      note: s.note,
    })),
  };
}

// Deletes all splits, reverting the transaction to normal single-category
// behavior — its category_id was never touched while split (see the
// migration comment), so it's already the "restored" category the moment
// there are no splits left.
export async function unsplitTransaction(transactionId: string): Promise<SaveSplitsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be logged in." };

  const { error } = await supabase
    .from("transaction_splits")
    .delete()
    .eq("transaction_id", transactionId)
    .eq("user_id", user.id);
  if (error) return { success: false, error: error.message };
  return { success: true, splits: [] };
}
