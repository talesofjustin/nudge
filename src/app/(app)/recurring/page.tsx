import { createClient } from "@/lib/supabase/server";
import { getRecurringItems } from "@/app/(app)/recurring/actions";
import { RecurringView } from "@/components/recurring/recurring-view";
import { PageHeader } from "@/components/ui/page-header";

export default async function RecurringPage() {
  const supabase = await createClient();

  const [items, { data: categories }, { data: accounts }] = await Promise.all([
    getRecurringItems(),
    supabase.from("categories").select("id, name, color, icon, kind").order("sort_order", { ascending: true }),
    supabase.from("accounts").select("id, name").order("created_at", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Recurring" subtitle="Subscriptions and regular charges detected from your transactions." />

      <RecurringView items={items} categories={categories ?? []} accounts={accounts ?? []} />
    </div>
  );
}
