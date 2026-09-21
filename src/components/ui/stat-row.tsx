import type { ReactNode } from "react";

// Shared "big figure, small muted label" building block for the compact
// stat rows that sit under a few page headers (e.g. Budget's spent/
// budgeted/remaining). Deliberately plainer than Recurring's single-number
// hero card — that one is a special-cased loud moment, this is a scannable
// row of several numbers at once.
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-start gap-x-6 gap-y-3">{children}</div>;
}

export function Stat({
  label,
  value,
  tone = "foreground",
}: {
  label: string;
  value: string;
  tone?: "foreground" | "mint" | "coral";
}) {
  const toneClass = tone === "mint" ? "text-mint" : tone === "coral" ? "text-coral" : "text-foreground";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium tracking-wide text-muted-2 uppercase">{label}</span>
      <span className={`text-[20px] leading-none font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}
