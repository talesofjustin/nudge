"use server";

import { createClient } from "@/lib/supabase/server";
import { buildOwnAccountSet, isTransferRecipient } from "@/lib/known-recipients";

export type ImportReviewItem = {
  importId: string;
  accountId: string;
  accountName: string;
  bookId: string | null;
  bookName: string | null;
  statementStartDate: string | null;
  statementEndDate: string | null;
  createdAt: string;
  totalCount: number;
  categorizedCount: number;
};

// "Needs review" is computed live from current transaction/split state —
// no cached status column. A transaction counts as resolved once it's a
// transfer (doesn't need a category at all), or every one of its split
// lines has a category, or (unsplit) its own category_id is set. An
// import drops off the queue the moment every one of its transactions is
// resolved. Only transactions stamped with import_id (imports made after
// that column existed) can appear here — see the migration.
export async function getImportReviewQueue(): Promise<ImportReviewItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: imports } = await supabase
    .from("imports")
    .select("id, account_id, book_id, statement_start_date, statement_end_date, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (!imports || imports.length === 0) return [];

  const importIds = imports.map((i) => i.id);

  const [{ data: txs }, { data: accounts }, { data: books }, { data: known }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, import_id, category_id, recipient, counterparty_iban")
      .eq("user_id", user.id)
      .in("import_id", importIds),
    supabase.from("accounts").select("id, name").eq("user_id", user.id),
    supabase.from("books").select("id, name").eq("user_id", user.id),
    supabase.from("known_recipients").select("recipient, counterparty_iban, is_own_account").eq("user_id", user.id),
  ]);

  if (!txs || txs.length === 0) return [];

  const txIds = txs.map((t) => t.id);
  const { data: splits } =
    txIds.length > 0
      ? await supabase.from("transaction_splits").select("transaction_id, category_id").in("transaction_id", txIds)
      : { data: [] };
  const splitsByTx = new Map<string, (string | null)[]>();
  for (const s of splits ?? []) {
    const list = splitsByTx.get(s.transaction_id) ?? [];
    list.push(s.category_id);
    splitsByTx.set(s.transaction_id, list);
  }

  const ownAccountSet = buildOwnAccountSet(
    (known ?? []).map((r) => ({ recipient: r.recipient, counterpartyIban: r.counterparty_iban, isOwnAccount: r.is_own_account })),
  );

  const accountNameById = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const bookNameById = new Map((books ?? []).map((b) => [b.id, b.name]));

  const byImport = new Map<string, { total: number; categorized: number }>();
  for (const tx of txs) {
    if (!tx.import_id) continue;
    const stats = byImport.get(tx.import_id) ?? { total: 0, categorized: 0 };
    stats.total += 1;

    const isTransfer = isTransferRecipient({ recipient: tx.recipient, counterpartyIban: tx.counterparty_iban }, ownAccountSet);
    const splitCategories = splitsByTx.get(tx.id);
    const resolved = isTransfer || (splitCategories && splitCategories.length > 0 ? splitCategories.every((c) => c !== null) : tx.category_id !== null);
    if (resolved) stats.categorized += 1;

    byImport.set(tx.import_id, stats);
  }

  const items: ImportReviewItem[] = [];
  for (const imp of imports) {
    const stats = byImport.get(imp.id);
    if (!stats || stats.categorized >= stats.total) continue; // no rows, or fully resolved -- not "needs review"
    items.push({
      importId: imp.id,
      accountId: imp.account_id,
      accountName: accountNameById.get(imp.account_id) ?? "Unknown account",
      bookId: imp.book_id,
      bookName: imp.book_id ? (bookNameById.get(imp.book_id) ?? null) : null,
      statementStartDate: imp.statement_start_date,
      statementEndDate: imp.statement_end_date,
      createdAt: imp.created_at,
      totalCount: stats.total,
      categorizedCount: stats.categorized,
    });
  }

  // imports was already fetched newest-first; byImport lookup preserves
  // that relative order since we iterate `imports` itself above.
  return items;
}
