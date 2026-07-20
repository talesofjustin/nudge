"use client";

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
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium transition-shadow ${
        active ? `ring-2 ring-offset-1 ring-offset-canvas ${tone === "amber" ? "ring-amber" : "ring-violet-400"}` : ""
      }`}
      style={{
        backgroundColor: `color-mix(in srgb, ${colorVar} 22%, var(--tint-base))`,
        color: `color-mix(in srgb, ${colorVar} 70%, black)`,
      }}
    >
      {children}
    </button>
  );
}

export function ContextStrip({
  dateFrom,
  dateTo,
  count,
  uncategorizedCount,
  showOnlyUncategorized,
  onToggleUncategorized,
  unassignedBookCount,
  showOnlyUnassignedBook,
  onToggleUnassignedBook,
  showBookFeature,
  duplicateCount,
  duplicateBannerDismissed,
  onReviewDuplicates,
  onDismissDuplicateBanner,
  selectedCount,
  confirmingDelete,
  deleting,
  onStartConfirmDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  dateFrom: string;
  dateTo: string;
  count: number;
  uncategorizedCount: number;
  showOnlyUncategorized: boolean;
  onToggleUncategorized: () => void;
  unassignedBookCount: number;
  showOnlyUnassignedBook: boolean;
  onToggleUnassignedBook: () => void;
  showBookFeature: boolean;
  duplicateCount: number;
  duplicateBannerDismissed: boolean;
  onReviewDuplicates: () => void;
  onDismissDuplicateBanner: () => void;
  selectedCount: number;
  confirmingDelete: boolean;
  deleting: boolean;
  onStartConfirmDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
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

      <div className="flex items-center justify-between gap-3 bg-canvas px-4 py-2.5">
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
                onClick={onStartConfirmDelete}
                className="font-medium text-danger hover:underline"
              >
                Delete
              </button>
            </div>
          )
        ) : (
          <div className="flex items-center gap-2">
            {uncategorizedCount > 0 && (
              <StatusChip tone="amber" active={showOnlyUncategorized} onClick={onToggleUncategorized}>
                {uncategorizedCount} uncategorized
              </StatusChip>
            )}
            {showBookFeature && unassignedBookCount > 0 && (
              <StatusChip tone="violet" active={showOnlyUnassignedBook} onClick={onToggleUnassignedBook}>
                {unassignedBookCount} need a book
              </StatusChip>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
