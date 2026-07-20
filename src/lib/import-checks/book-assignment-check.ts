import { createClient } from "@/lib/supabase/server";
import { normalizeRecipient } from "@/lib/known-recipients";
import type { FlagItem, ImportCheckContext, ImportFlag } from "./types";

export const CHECK_ID = "book-assignment";

// Resolves each row's book via the account-default + recipient-rule chain
// (the transaction-level layer doesn't apply yet — these rows don't exist
// as transactions). Groups any recipients that don't resolve into one flag
// card with a picker per recipient. Progressive disclosure: with fewer than
// two books, "book" isn't a concept yet, so this never raises anything.
export async function run(ctx: ImportCheckContext): Promise<ImportFlag[]> {
  if (!ctx.accountId) return [];

  const supabase = await createClient();

  const [{ data: account }, { data: bookRules }, { data: books }] = await Promise.all([
    supabase.from("accounts").select("default_book_id").eq("id", ctx.accountId).single(),
    supabase.from("recipient_book_rules").select("recipient, book_id").eq("user_id", ctx.userId),
    supabase.from("books").select("id, name").eq("user_id", ctx.userId).order("created_at", { ascending: true }),
  ]);

  if (!books || books.length < 2) return [];

  const ruleMap = new Map((bookRules ?? []).map((r) => [normalizeRecipient(r.recipient), r.book_id]));
  const accountDefault = account?.default_book_id ?? null;

  const unresolved = new Map<string, string>(); // normalized -> original-cased recipient
  for (const row of ctx.rows) {
    if (!row.recipient) continue;
    const key = normalizeRecipient(row.recipient);
    const resolved = ruleMap.get(key) ?? accountDefault;
    if (!resolved && !unresolved.has(key)) unresolved.set(key, row.recipient);
  }

  if (unresolved.size === 0) return [];

  const items: FlagItem[] = Array.from(unresolved.values()).map((recipient) => ({
    id: `book:${normalizeRecipient(recipient)}`,
    label: recipient,
    data: { recipient },
  }));

  return [
    {
      id: "book-assignment",
      checkId: CHECK_ID,
      title: items.length === 1 ? "1 recipient needs a book" : `${items.length} recipients need a book`,
      message: "Pick a book for each — or leave any unresolved and sort them out after import.",
      items,
      blocking: false,
    },
  ];
}
