import { createClient } from "@/lib/supabase/server";
import { getBooksForSettings } from "@/app/(app)/settings/actions";
import { getAllRules } from "@/app/(app)/transactions/actions";
import { RulesManager } from "@/components/settings/rules-manager";

export default async function RulesSettingsPage() {
  const supabase = await createClient();
  const [books, rules, { data: categories }] = await Promise.all([
    getBooksForSettings(),
    getAllRules(),
    supabase.from("categories").select("id, name, color, icon, kind").order("sort_order", { ascending: true }),
  ]);

  const showBookFeature = books.length > 1;

  return (
    <RulesManager rules={rules} books={books} categories={categories ?? []} showBookFeature={showBookFeature} />
  );
}
