"use client";

import { FilterIcon } from "@/components/icons/dashboard-icons";

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatDayWithYear(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatRangeLabel(dateFrom: string, dateTo: string): string {
  return `${formatDay(dateFrom)} – ${formatDayWithYear(dateTo)}`;
}

// Same active treatment as the toolbar's SecondaryFilterChip (violet
// border + tint once engaged) plus a filter icon so the chip reads as
// "click to filter" rather than a static status badge, and a visible
// hover state so it doesn't look inert before the first click.
function StatusChip({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "amber" | "violet";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const colorVar = tone === "amber" ? "var(--amber)" : "var(--violet-400)";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium transition-all hover:brightness-95 active:scale-[0.97] ${
        active ? `ring-2 ring-offset-1 ring-offset-canvas ${tone === "amber" ? "ring-amber" : "ring-violet-400"}` : ""
      }`}
      style={{
        backgroundColor: `color-mix(in srgb, ${colorVar} 22%, var(--tint-base))`,
        color: `color-mix(in srgb, ${colorVar} 70%, black)`,
      }}
    >
      <FilterIcon className="h-3 w-3 shrink-0 opacity-70" />
      {children}
    </button>
  );
}

export function ContextStrip({
  dateFrom,
  dateTo,
  count,
  needsReviewCount,
  needsReviewLabel,
  showOnlyNeedsReview,
  onToggleNeedsReview,
  unreviewedCount,
  showOnlyUnreviewed,
  onToggleUnreviewed,
  duplicateCount,
  duplicateBannerDismissed,
  onReviewDuplicates,
  onDismissDuplicateBanner,
  selectedCount,
  confirmingDelete,
  deleting,
  marking,
  onStartConfirmDelete,
  onCancelDelete,
  onConfirmDelete,
  onMarkReviewed,
}: {
  dateFrom: string;
  dateTo: string;
  count: number;
  needsReviewCount: number;
  needsReviewLabel: string;
  showOnlyNeedsReview: boolean;
  onToggleNeedsReview: () => void;
  unreviewedCount: number;
  showOnlyUnreviewed: boolean;
  onToggleUnreviewed: () => void;
  duplicateCount: number;
  duplicateBannerDismissed: boolean;
  onReviewDuplicates: () => void;
  onDismissDuplicateBanner: () => void;
  selectedCount: number;
  confirmingDelete: boolean;
  deleting: boolean;
  marking: boolean;
  onStartConfirmDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onMarkReviewed: () => void;
}) {
  return (
    <div className="border-b border-border">
      {duplicateCount > 0 && !duplicateBannerDismissed && (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-canvas px-4 py-2">
          <span className="text-[12.5px] text-foreground">
            <span className="font-medium">{duplicateCount}</span> possible duplicate
            {duplicateCount === 1 ? "" : "s"} found ·{" "}
            <button type="button" onClick={onReviewDuplicates} className="font-medium text-violet-600 hover:underline">
              Review
            </button>
          </span>
          <button
            type="button"
            onClick={onDismissDuplicateBanner}
            className="text-[12px] text-muted hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sticky only while a selection is active — that's the moment Delete
          / Mark as reviewed need to stay reachable without scrolling back
          up. The table header's own sticky offset (transactions-view.tsx)
          shifts down to match this row's height (h-11) so the two don't
          overlap once both are pinned to the viewport top. */}
      <div
        className={`flex h-11 items-center justify-between gap-3 bg-canvas px-4 ${
          selectedCount > 0 ? "sticky top-0 z-20 border-b border-border" : ""
        }`}
      >
        <span className="text-[12.5px] text-muted">
          {formatRangeLabel(dateFrom, dateTo)} · {count} transaction{count === 1 ? "" : "s"}
        </span>

        {selectedCount > 0 ? (
          confirmingDelete ? (
            <div className="flex items-center gap-2 text-[12.5px]">
              <span className="text-muted">Delete {selectedCount} permanently?</span>
              <button
                type="button"
                onClick={onCancelDelete}
                disabled={deleting}
                className="font-medium text-muted hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={deleting}
                className="font-medium text-danger hover:underline disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Confirm"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[12.5px]">
              <span className="font-medium text-foreground">{selectedCount} selected</span>
              <span className="text-muted">·</span>
              <button
                type="button"
                onClick={onMarkReviewed}
                disabled={marking}
                className="font-medium text-violet-600 hover:underline disabled:opacity-50"
              >
                {marking ? "Marking…" : "Mark as reviewed"}
              </button>
              <span className="text-muted">·</span>
              <button
                type="button"
                onClick={onStartConfirmDelete}
                className="font-medium text-danger hover:underline"
              >
                Delete
              </button>
            </div>
          )
        ) : (
          <div className="flex items-center gap-2">
            {needsReviewCount > 0 && (
              <StatusChip tone="amber" active={showOnlyNeedsReview} onClick={onToggleNeedsReview}>
                {needsReviewCount} {needsReviewLabel}
              </StatusChip>
            )}
            {unreviewedCount > 0 && (
              <StatusChip tone="violet" active={showOnlyUnreviewed} onClick={onToggleUnreviewed}>
                {unreviewedCount} auto-categorised, not yet reviewed
              </StatusChip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
