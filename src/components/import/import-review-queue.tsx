import Link from "next/link";
import type { ImportReviewItem } from "@/app/(app)/import/review-queue-actions";

function formatPeriod(start: string | null, end: string | null): string {
  if (!start || !end) return "Unknown period";
  const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)}`;
}

// Surfaced above the upload area — most recent import first — so pending
// review work is one of the first things visible whenever there's any.
// Hidden entirely (not an empty state) when the queue is empty, per the
// "don't compete for attention" rule.
export function ImportReviewQueue({ items }: { items: ImportReviewItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="shadow-soft overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[14px] font-semibold text-foreground">Needs review</h2>
        <p className="mt-0.5 text-[12.5px] text-muted">
          {items.length} import{items.length === 1 ? "" : "s"} still {items.length === 1 ? "has" : "have"} uncategorized
          transactions.
        </p>
      </div>
      <div className="flex flex-col divide-y divide-border">
        {items.map((item) => {
          const pct = item.totalCount > 0 ? Math.round((item.categorizedCount / item.totalCount) * 100) : 0;
          return (
            <Link
              key={item.importId}
              href={`/transactions?import=${item.importId}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-canvas"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[13.5px] font-medium text-foreground">{item.accountName}</span>
                  {item.bookName && <span className="text-[12px] text-muted-2">· {item.bookName}</span>}
                </div>
                <p className="mt-0.5 text-[12px] text-muted">
                  {formatPeriod(item.statementStartDate, item.statementEndDate)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-canvas">
                  <div className="h-full rounded-full bg-violet-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-[68px] shrink-0 text-right text-[12.5px] font-medium text-muted">
                  {item.categorizedCount} of {item.totalCount}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
