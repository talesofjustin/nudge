import type { TransactionRowData } from "@/app/(app)/transactions/actions";
import type { CategoryInfo } from "@/components/transactions/category-badge";

export function FilterSummary({
  rows,
  categoriesById,
}: {
  rows: TransactionRowData[];
  categoriesById: Map<string, CategoryInfo>;
}) {
  if (rows.length === 0) return null;

  let income = 0;
  let expense = 0;
  const expenseByCategory = new Map<string, number>();

  for (const row of rows) {
    if (row.isTransfer) continue;
    if (row.amount > 0) {
      income += row.amount;
    } else {
      const abs = Math.abs(row.amount);
      expense += abs;
      if (row.categoryId) {
        expenseByCategory.set(row.categoryId, (expenseByCategory.get(row.categoryId) ?? 0) + abs);
      }
    }
  }

  let biggestCategoryName: string | null = null;
  let biggestAmount = 0;
  for (const [categoryId, amount] of expenseByCategory) {
    if (amount > biggestAmount) {
      biggestAmount = amount;
      biggestCategoryName = categoriesById.get(categoryId)?.name ?? null;
    }
  }

  return (
    <p className="text-[13px] text-muted">
      In this period:{" "}
      <span className="font-medium text-mint">€{income.toFixed(2)} in</span>,{" "}
      <span className="font-medium text-foreground">€{expense.toFixed(2)} out</span>
      {biggestCategoryName && (
        <>
          , mostly on <span className="font-medium text-foreground">{biggestCategoryName}</span>
        </>
      )}
      .
    </p>
  );
}
