import { createClient } from "@/lib/supabase/server";
import { identityKey } from "@/lib/counterparty-identity";
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
    supabase.from("recipient_book_rules").select("identity_key, book_id").eq("user_id", ctx.userId),
    supabase.from("books").select("id, name").eq("user_id", ctx.userId).order("created_at", { ascending: true }),
  ]);

  if (!books || books.length < 2) return [];

  const ruleMap = new Map((bookRules ?? []).map((r) => [r.identity_key, r.book_id]));
  const accountDefault = account?.default_book_id ?? null;

  const unresolved = new Map<string, { recipient: string; counterpartyIban: string | null }>();
  for (const row of ctx.rows) {
    if (!row.recipient) continue;
    const key = identityKey({ recipient: row.recipient, counterpartyIban: row.counterpartyIban });
    if (!key) continue;
    const resolved = ruleMap.get(key) ?? accountDefault;
    if (!resolved && !unresolved.has(key)) {
      unresolved.set(key, { recipient: row.recipient, counterpartyIban: row.counterpartyIban });
    }
  }

  if (unresolved.size === 0) return [];

  const items: FlagItem[] = Array.from(unresolved.entries()).map(([key, entry]) => ({
    id: `book:${key}`,
    label: entry.recipient,
    data: { recipient: entry.recipient, counterpartyIban: entry.counterpartyIban ?? "" },
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
