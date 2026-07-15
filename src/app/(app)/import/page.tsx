import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/user-settings";
import { ImportWizard } from "@/components/import/import-wizard";
import { ImportHistory } from "@/components/import/import-history";

export default async function ImportPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: spaces }, settings, { data: imports }] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, type")
        .order("created_at", { ascending: true }),
      supabase
        .from("spaces")
        .select("id, name")
        .order("created_at", { ascending: true }),
      getUserSettings(),
      supabase
        .from("imports")
        .select("id, filename, row_count, created_at, account_id")
        .order("created_at", { ascending: false }),
    ]);

  const accountsById = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const importHistory = (imports ?? []).map((imp) => ({
    id: imp.id,
    filename: imp.filename,
    rowCount: imp.row_count,
    createdAt: imp.created_at,
    accountName: accountsById.get(imp.account_id) ?? "Unknown account",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Import</h1>
        <p className="mt-1 text-[15px] text-muted">
          Upload a CSV export from your bank or card statement.
        </p>
      </div>

      <ImportWizard accounts={accounts ?? []} spaces={spaces ?? []} settings={settings} />

      <ImportHistory imports={importHistory} />
    </div>
  );
}
