"use server";

import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/lib/supabase/database.types";

export type ProfileData = { email: string; displayName: string };

export async function getProfile(): Promise<ProfileData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    email: user?.email ?? "",
    displayName: (user?.user_metadata?.display_name as string | undefined) ?? "",
  };
}

export async function updateDisplayName(name: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
  return { success: !error };
}

export type AccountData = {
  id: string;
  name: string;
  type: AccountType;
  defaultBookId: string | null;
  hasColumnMapping: boolean;
};

export async function getAccountsForSettings(): Promise<AccountData[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("accounts")
    .select("id, name, type, default_book_id, column_mapping")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    defaultBookId: a.default_book_id,
    hasColumnMapping: a.column_mapping !== null,
  }));
}

// The "What's this account for?" question never says "book" — it finds or
// creates one behind the scenes by the plain-language answer (Personal /
// Business / Shared / a free-text name), matching case-insensitively so
// answering "Business" twice reuses the same book rather than creating
// duplicates.
async function findOrCreateBookByName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing } = await supabase
    .from("books")
    .select("id, name")
    .eq("user_id", userId);

  const match = (existing ?? []).find((b) => b.name.toLowerCase() === trimmed.toLowerCase());
  if (match) return match.id;

  const { data: created, error } = await supabase
    .from("books")
    .insert({ user_id: userId, name: trimmed })
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}

export async function createAccount(
  name: string,
  type: AccountType,
  bookAnswer: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in." };
  if (!name.trim()) return { success: false, error: "Name is required." };

  const bookId = await findOrCreateBookByName(supabase, user.id, bookAnswer);

  const { data, error } = await supabase
    .from("accounts")
    .insert({ user_id: user.id, name: name.trim(), type, default_book_id: bookId })
    .select("id")
    .single();

  if (error || !data) return { success: false, error: "Could not create account." };
  return { success: true, id: data.id };
}

export async function updateAccount(
  id: string,
  updates: { name?: string; type?: AccountType; defaultBookId?: string | null },
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("accounts")
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.type !== undefined && { type: updates.type }),
      ...(updates.defaultBookId !== undefined && { default_book_id: updates.defaultBookId }),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  return { success: !error };
}

export async function deleteAccount(id: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", user.id);
  return { success: !error };
}

export async function resetColumnMapping(accountId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase
    .from("accounts")
    .update({ column_mapping: null })
    .eq("id", accountId)
    .eq("user_id", user.id);

  return { success: !error };
}

// ---------------------------------------------------------------------------
// Books — managed explicitly only here; this is the one place the generic
// term "books" is allowed to appear in copy.
// ---------------------------------------------------------------------------

export type BookData = { id: string; name: string; accountCount: number };

export async function getBooksForSettings(): Promise<BookData[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: books }, { data: accounts }] = await Promise.all([
    supabase.from("books").select("id, name").eq("user_id", user.id).order("created_at", { ascending: true }),
    supabase.from("accounts").select("default_book_id").eq("user_id", user.id),
  ]);

  const countByBook = new Map<string, number>();
  for (const a of accounts ?? []) {
    if (!a.default_book_id) continue;
    countByBook.set(a.default_book_id, (countByBook.get(a.default_book_id) ?? 0) + 1);
  }

  return (books ?? []).map((b) => ({ id: b.id, name: b.name, accountCount: countByBook.get(b.id) ?? 0 }));
}

export async function createBook(name: string): Promise<{ success: boolean; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !name.trim()) return { success: false };

  const { data, error } = await supabase
    .from("books")
    .insert({ user_id: user.id, name: name.trim() })
    .select("id")
    .single();

  if (error || !data) return { success: false };
  return { success: true, id: data.id };
}

export async function renameBook(id: string, name: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !name.trim()) return { success: false };

  const { error } = await supabase
    .from("books")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("user_id", user.id);

  return { success: !error };
}

// The account FK (default_book_id) and transaction FK (book_id) are both
// "on delete set null" — deleting a book unassigns its accounts and
// transactions automatically, nothing else to clean up here.
export async function deleteBook(id: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase.from("books").delete().eq("id", id).eq("user_id", user.id);
  return { success: !error };
}
