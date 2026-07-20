import { createClient } from "@/lib/supabase/server";
import { getRecurringItems } from "@/app/(app)/recurring/actions";
import { RecurringView } from "@/components/recurring/recurring-view";

export default async function RecurringPage() {
  const supabase = await createClient();

  const [items, { data: categories }, { data: accounts }] = await Promise.all([
    getRecurringItems(),
    supabase.from("categories").select("id, name, color, icon, kind").order("created_at", { ascending: true }),
    supabase.from("accounts").select("id, name").order("created_at", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="pl-6">
        <h1 className="text-[22px] font-semibold text-ink">Recurring</h1>
        <p className="mt-1 text-[15px] text-muted">
          Subscriptions and regular charges detected from your transactions.
        </p>
      </div>

      <RecurringView items={items} categories={categories ?? []} accounts={accounts ?? []} />
    </div>
  );
}
