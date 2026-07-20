import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/user-settings";
import { getFinancialMonthRange } from "@/lib/financial-month";
import {
  parseBudgetMonthFromParams,
  parseBudgetBookFromParams,
  type SearchParamsInput,
} from "@/lib/budget-filters";
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

  const { data: books } = await supabase
    .from("books")
    .select("id, name")
    .order("created_at", { ascending: true });

  // Budgets scoped to a specific book only once a second book exists —
  // otherwise there's nothing to choose between and the global (book_id
  // null) budget is used everywhere, per the progressive-disclosure rule.
  const showBookFeature = (books?.length ?? 0) > 1;
  const requestedBookId = parseBudgetBookFromParams(params);
  const bookId = showBookFeature
    ? (books!.find((b) => b.id === requestedBookId)?.id ?? books![0].id)
    : null;

  const [{ data: categories }, progress] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, color, icon, kind")
      .order("created_at", { ascending: true }),
    getBudgetProgress(month.from, month.to, bookId),
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
        books={books ?? []}
        initialMonth={month}
        initialBookId={bookId}
        initialProgress={progress}
        paydayAnchorDay={settings.paydayAnchorDay}
        budgetTipDismissed={settings.budgetTipDismissed}
      />
    </div>
  );
}
