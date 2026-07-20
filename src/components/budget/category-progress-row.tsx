import { CategoryBadge, type CategoryInfo } from "@/components/transactions/category-badge";

export function CategoryProgressRow({
  category,
  spent,
  budgeted,
}: {
  category: CategoryInfo;
  spent: number;
  budgeted: number;
}) {
  const pct = budgeted > 0 ? spent / budgeted : spent > 0 ? 1 : 0;

  // Saving categories are a target, not a limit: reaching or exceeding it
  // is the goal, so it's never shown as "over" in coral — under target is
  // amber, reached is mint.
  if (category.kind === "saving") {
    const reached = spent >= budgeted;
    const remaining = budgeted - spent;
    const trackStyle = { backgroundColor: `color-mix(in srgb, ${category.color} 15%, var(--tint-base))` };
    const fillColor = reached ? "var(--mint)" : "var(--amber)";

    return (
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="w-40 shrink-0">
          <CategoryBadge category={category} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full" style={trackStyle}>
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${Math.min(pct, 1) * 100}%`, backgroundColor: fillColor }}
            />
          </div>
        </div>

        <div className="w-28 shrink-0 text-right text-[13px] tabular-nums text-muted">
          €{spent.toFixed(2)} of €{budgeted.toFixed(2)} target
        </div>

        <div
          className={`w-24 shrink-0 text-right text-[13px] font-medium tabular-nums ${
            reached ? "text-mint" : "text-amber"
          }`}
        >
          {reached ? "Target reached" : `€${Math.abs(remaining).toFixed(2)} to go`}
        </div>
      </div>
    );
  }

  const isOver = spent > budgeted;
  const isApproaching = !isOver && pct >= 0.8;
  const remaining = budgeted - spent;

  const trackStyle = isOver
    ? { backgroundColor: "color-mix(in srgb, var(--coral) 20%, var(--tint-base))" }
    : { backgroundColor: `color-mix(in srgb, ${category.color} 15%, var(--tint-base))` };
  const fillColor = isOver ? "var(--coral)" : isApproaching ? "var(--amber)" : category.color;

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="w-40 shrink-0">
        <CategoryBadge category={category} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="h-2 w-full overflow-hidden rounded-full" style={trackStyle}>
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${Math.min(pct, 1) * 100}%`, backgroundColor: fillColor }}
          />
        </div>
      </div>

      <div className="w-28 shrink-0 text-right text-[13px] tabular-nums text-muted">
        €{spent.toFixed(2)} / €{budgeted.toFixed(2)}
      </div>

      <div
        className={`w-24 shrink-0 text-right text-[13px] font-medium tabular-nums ${
          remaining >= 0 ? "text-mint" : "text-coral"
        }`}
      >
        {remaining >= 0 ? `€${remaining.toFixed(2)} left` : `€${Math.abs(remaining).toFixed(2)} over`}
      </div>
    </div>
  );
}
