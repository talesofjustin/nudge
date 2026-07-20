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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-foreground">
          Spent <span className="font-semibold tabular-nums">€{totalSpent.toFixed(2)}</span> of €
          {totalBudgeted.toFixed(2)} budgeted
          {totalSavingTarget > 0 && (
            <>
              {" "}
              · Saved{" "}
              <span className="font-semibold tabular-nums text-mint">€{totalSaved.toFixed(2)}</span> of €
              {totalSavingTarget.toFixed(2)} target
            </>
          )}
        </p>

        {isCurrentMonth && (
          <p className="text-[13px] text-muted">
            Day {dayOfMonth} of {totalDays}
          </p>
        )}
      </div>

      <p className={`mt-1.5 text-[13px] font-medium ${remaining >= 0 ? "text-mint" : "text-coral"}`}>
        {remaining >= 0 ? `€${remaining.toFixed(2)} remaining` : `€${Math.abs(remaining).toFixed(2)} over budget`}
      </p>

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
