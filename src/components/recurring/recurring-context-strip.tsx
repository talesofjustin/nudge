"use client";

function StatusChip({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "amber" | "coral";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const colorVar = tone === "amber" ? "var(--amber)" : "var(--coral)";
  const ringClass = tone === "amber" ? "ring-amber" : "ring-coral";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium transition-shadow ${
        active ? `ring-2 ring-offset-1 ring-offset-canvas ${ringClass}` : ""
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

export function RecurringContextStrip({
  count,
  unreviewedCount,
  showOnlyUnreviewed,
  onToggleUnreviewed,
  staleCount,
  showOnlyStale,
  onToggleStale,
}: {
  count: number;
  unreviewedCount: number;
  showOnlyUnreviewed: boolean;
  onToggleUnreviewed: () => void;
  staleCount: number;
  showOnlyStale: boolean;
  onToggleStale: () => void;
}) {
  return (
    <div className="border-b border-border">
      {unreviewedCount > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-canvas px-4 py-2">
          <span className="text-[12.5px] text-foreground">
            We think <span className="font-medium">{unreviewedCount}</span> item
            {unreviewedCount === 1 ? " is" : "s are"} recurring ·{" "}
            <button
              type="button"
              onClick={onToggleUnreviewed}
              className="font-medium text-violet-600 hover:underline"
            >
              {showOnlyUnreviewed ? "Show all" : "Confirm?"}
            </button>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 bg-canvas px-4 py-2.5">
        <span className="text-[12.5px] text-muted">
          {count} recurring item{count === 1 ? "" : "s"}
        </span>

        {staleCount > 0 && (
          <StatusChip tone="coral" active={showOnlyStale} onClick={onToggleStale}>
            {staleCount} possibly cancelled
          </StatusChip>
        )}
      </div>
    </div>
  );
}
