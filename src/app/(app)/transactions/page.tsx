import { createClient } from "@/lib/supabase/server";
import { getPresetRange } from "@/lib/date-presets";
import { getUserSettings } from "@/lib/user-settings";
import { parseFiltersFromParams, type SearchParamsInput } from "@/lib/transaction-filters";
import { getFilteredTransactions } from "@/app/(app)/transactions/actions";
import { TransactionsView } from "@/components/transactions/transactions-view";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const supabase = await createClient();
  const [params, settings] = await Promise.all([searchParams, getUserSettings()]);

  const defaultRange = getPresetRange("month", settings.paydayAnchorDay);
  const filters = parseFiltersFromParams(params, defaultRange);

  const [{ data: accounts }, { data: spaces }, { data: categories }, transactionsResult] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name")
        .order("created_at", { ascending: true }),
      supabase
        .from("spaces")
        .select("id, name")
        .order("created_at", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name, color, icon")
        .order("created_at", { ascending: true }),
      getFilteredTransactions({
        spaceId: filters.spaceId,
        accountId: filters.accountId,
        categoryIds: filters.categoryIds,
        amountMin: filters.amountMin.trim() ? Number(filters.amountMin) : null,
        amountMax: filters.amountMax.trim() ? Number(filters.amountMax) : null,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        recipient: filters.recipient,
      }),
    ]);

  const initialRows = transactionsResult.success ? transactionsResult.rows : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="pl-6">
        <h1 className="text-[22px] font-semibold text-ink">Transactions</h1>
        <p className="mt-1 text-[15px] text-muted">
          All your imported transactions, most recent first.
        </p>
      </div>

      <TransactionsView
        accounts={accounts ?? []}
        spaces={spaces ?? []}
        categories={categories ?? []}
        initialRows={initialRows}
        initialFilters={filters}
        paydayAnchorDay={settings.paydayAnchorDay}
      />
    </div>
  );
}
