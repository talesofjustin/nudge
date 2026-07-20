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
  // amber, at/over target is mint with celebratory copy.
  if (category.kind === "saving") {
    const ahead = spent - budgeted;
    const reached = ahead >= 0;
    const trackStyle = { backgroundColor: `color-mix(in srgb, ${category.color} 15%, var(--tint-base))` };
    const fillColor = reached ? "var(--mint)" : "var(--amber)";
    const statusLabel = ahead > 0 ? `€${ahead.toFixed(2)} ahead` : ahead === 0 ? "Target reached" : `€${Math.abs(ahead).toFixed(2)} to go`;

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
          {statusLabel}
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
