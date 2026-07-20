export function BudgetSummary({
  totalBudgeted,
  totalSpent,
  dayOfMonth,
  totalDays,
  isCurrentMonth,
  unassignedCount,
}: {
  totalBudgeted: number;
  totalSpent: number;
  dayOfMonth: number;
  totalDays: number;
  isCurrentMonth: boolean;
  unassignedCount?: number;
}) {
  const remaining = totalBudgeted - totalSpent;

  return (
    <div className="border-b border-border px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex gap-7">
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted uppercase">Budgeted</p>
            <p className="mt-0.5 text-[20px] font-semibold text-foreground tabular-nums">
              €{totalBudgeted.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted uppercase">Spent</p>
            <p className="mt-0.5 text-[20px] font-semibold text-foreground tabular-nums">
              €{totalSpent.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-wide text-muted uppercase">Remaining</p>
            <p
              className={`mt-0.5 text-[20px] font-semibold tabular-nums ${
                remaining >= 0 ? "text-mint" : "text-coral"
              }`}
            >
              {remaining >= 0 ? "€" : "-€"}
              {Math.abs(remaining).toFixed(2)}
            </p>
          </div>
        </div>

        {isCurrentMonth && (
          <p className="text-[13px] text-muted">
            Day {dayOfMonth} of {totalDays}
          </p>
        )}
      </div>

      {/* Only surfaces once book-scoping is actually in effect (>1 book) —
          otherwise there's no book for a transaction to be missing. */}
      {!!unassignedCount && unassignedCount > 0 && (
        <p className="mt-2 text-[12.5px] text-muted-2">
          {unassignedCount} transaction{unassignedCount === 1 ? "" : "s"} need a book and{" "}
          {unassignedCount === 1 ? "isn't" : "aren't"} included above.
        </p>
      )}
    </div>
  );
}
