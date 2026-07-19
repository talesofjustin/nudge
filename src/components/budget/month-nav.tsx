"use client";

import { ChevronRightIcon } from "@/components/icons/dashboard-icons";

function formatMonthLabel(from: string, to: string): string {
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  const sameMonth = f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear();

  if (sameMonth) {
    return f.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  const fromLabel = f.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const toLabel = t.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return `${fromLabel} – ${toLabel}`;
}

export function MonthNav({
  from,
  to,
  isCurrentMonth,
  onPrev,
  onNext,
  onToday,
}: {
  from: string;
  to: string;
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous month"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-foreground"
        >
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
        </button>
        <span className="min-w-[170px] text-center text-[14px] font-semibold text-foreground">
          {formatMonthLabel(from, to)}
        </span>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next month"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-foreground"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      {!isCurrentMonth && (
        <button
          type="button"
          onClick={onToday}
          className="text-[13px] font-medium text-violet-600 hover:underline"
        >
          Back to this month
        </button>
      )}
    </div>
  );
}
