import { Stat, StatRow } from "@/components/ui/stat-row";

export function BudgetSummary({
  totalBudgeted,
  totalSpent,
  totalSaved,
  totalSavingTarget,
  dayOfMonth,
  totalDays,
  isCurrentMonth,
  unassignedCount,
}: {
  totalBudgeted: number;
  totalSpent: number;
  totalSaved: number;
  totalSavingTarget: number;
  dayOfMonth: number;
  totalDays: number;
  isCurrentMonth: boolean;
  unassignedCount?: number;
}) {
  const remaining = totalBudgeted - totalSpent;

  return (
    <div className="border-b border-border px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatRow>
          <Stat label="Spent" value={`€${totalSpent.toFixed(2)}`} />
          <Stat label="Budgeted" value={`€${totalBudgeted.toFixed(2)}`} />
          <Stat
            label={remaining >= 0 ? "Remaining" : "Over budget"}
            value={`€${Math.abs(remaining).toFixed(2)}`}
            tone={remaining >= 0 ? "mint" : "coral"}
          />
          {totalSavingTarget > 0 && (
            <Stat label="Saved" value={`€${totalSaved.toFixed(2)} / €${totalSavingTarget.toFixed(2)}`} tone="mint" />
          )}
        </StatRow>

        {isCurrentMonth && (
          <p className="shrink-0 text-[13px] text-muted">
            Day {dayOfMonth} of {totalDays}
          </p>
        )}
      </div>

      {/* Only surfaces once book-scoping is actually in effect (>1 book) —
          otherwise there's no book for a transaction to be missing. */}
      {!!unassignedCount && unassignedCount > 0 && (
        <p className="mt-3 text-[12.5px] text-muted-2">
          {unassignedCount} transaction{unassignedCount === 1 ? "" : "s"} need a book and{" "}
          {unassignedCount === 1 ? "isn't" : "aren't"} included above.
        </p>
      )}
    </div>
  );
}
