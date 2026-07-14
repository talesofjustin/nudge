import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/user-settings";
import { ImportWizard } from "@/components/import/import-wizard";

export default async function ImportPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: spaces }, settings] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, type")
      .order("created_at", { ascending: true }),
    supabase
      .from("spaces")
      .select("id, name")
      .order("created_at", { ascending: true }),
    getUserSettings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Import</h1>
        <p className="mt-1 text-[15px] text-muted">
          Upload a CSV export from your bank or card statement.
        </p>
      </div>

      <ImportWizard accounts={accounts ?? []} spaces={spaces ?? []} settings={settings} />
    </div>
  );
}
