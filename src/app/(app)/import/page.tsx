import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/user-settings";
import { getImportAccounts } from "@/app/(app)/import/actions";
import { ImportWizard } from "@/components/import/import-wizard";
import { ImportHistory } from "@/components/import/import-history";

export default async function ImportPage() {
  const supabase = await createClient();

  const [accounts, { data: books }, settings, { data: imports }] = await Promise.all([
    getImportAccounts(),
    supabase
      .from("books")
      .select("id, name")
      .order("created_at", { ascending: true }),
    getUserSettings(),
    supabase
      .from("imports")
      .select(
        "id, filename, row_count, skipped_count, statement_start_date, statement_end_date, created_at, account_id, book_id",
      )
      .order("created_at", { ascending: false }),
  ]);

  const showBookFeature = (books?.length ?? 0) > 1;
  const accountsById = new Map(accounts.map((a) => [a.id, a.name]));
  const booksById = new Map((books ?? []).map((b) => [b.id, b.name]));
  const importHistory = (imports ?? []).map((imp) => ({
    id: imp.id,
    filename: imp.filename,
    rowCount: imp.row_count,
    skippedCount: imp.skipped_count,
    createdAt: imp.created_at,
    accountName: accountsById.get(imp.account_id) ?? "Unknown account",
    bookName: imp.book_id ? (booksById.get(imp.book_id) ?? null) : null,
    statementStartDate: imp.statement_start_date,
    statementEndDate: imp.statement_end_date,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* pl-6 matches Card's own left padding (p-6) so the title's first
          character lines up with card content's first character below. */}
      <div className="pl-6">
        <h1 className="text-[22px] font-semibold text-ink">Import</h1>
        <p className="mt-1 text-[15px] text-muted">
          Upload a CSV export from your bank or card statement.
        </p>
      </div>

      <ImportWizard accounts={accounts} books={books ?? []} settings={settings} />

      <ImportHistory imports={importHistory} showBookFeature={showBookFeature} />
    </div>
  );
}
