import { createClient } from "@/lib/supabase/server";
import { getPresetRange } from "@/lib/date-presets";
import { TransactionsView } from "@/components/transactions/transactions-view";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { from, to } = getPresetRange("month");

  const [{ data: accounts }, { data: spaces }, { data: categories }, { data: transactions }] =
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
      supabase
        .from("transactions")
        .select(
          "id, account_id, category_id, space_id, amount, recipient, description, occurred_at, is_recurring",
        )
        .gte("occurred_at", from ?? undefined)
        .lte("occurred_at", to ?? undefined)
        .order("occurred_at", { ascending: false }),
    ]);

  const initialRows = (transactions ?? []).map((row) => ({
    id: row.id,
    accountId: row.account_id,
    categoryId: row.category_id,
    spaceId: row.space_id,
    amount: row.amount,
    recipient: row.recipient,
    description: row.description,
    occurredAt: row.occurred_at,
    isRecurring: row.is_recurring,
  }));

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
      />
    </div>
  );
}
