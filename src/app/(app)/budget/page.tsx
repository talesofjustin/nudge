import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/user-settings";
import { getFinancialMonthRange } from "@/lib/financial-month";
import { parseBudgetMonthFromParams, type SearchParamsInput } from "@/lib/budget-filters";
import { getBudgetProgress } from "@/app/(app)/budget/actions";
import { BudgetView } from "@/components/budget/budget-view";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const supabase = await createClient();
  const [params, settings] = await Promise.all([searchParams, getUserSettings()]);

  const defaultMonth = getFinancialMonthRange(new Date(), settings.paydayAnchorDay);
  const month = parseBudgetMonthFromParams(params, defaultMonth);

  const [{ data: categories }, progress] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, color, icon")
      .order("created_at", { ascending: true }),
    getBudgetProgress(month.from, month.to),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="pl-6">
        <h1 className="text-[22px] font-semibold text-ink">Budget</h1>
        <p className="mt-1 text-[15px] text-muted">
          Plan and track spending against your categories, month by month.
        </p>
      </div>

      <BudgetView
        categories={categories ?? []}
        initialMonth={month}
        initialProgress={progress}
        paydayAnchorDay={settings.paydayAnchorDay}
        budgetTipDismissed={settings.budgetTipDismissed}
      />
    </div>
  );
}
