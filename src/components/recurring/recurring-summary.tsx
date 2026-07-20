// The "I'm paying HOW much a year?" moment — deliberately the loudest
// number on the page. Only confirmed items count: a suggestion the user
// hasn't acted on yet isn't a real commitment to total up.
export function RecurringSummary({
  monthlyCost,
  annualCost,
  count,
}: {
  monthlyCost: number;
  annualCost: number;
  count: number;
}) {
  if (count === 0) {
    return (
      <div className="shadow-soft rounded-[20px] border border-border bg-surface p-6">
        <p className="text-[14px] text-muted">
          No confirmed recurring items yet. Detected subscriptions show up below, ready to confirm.
        </p>
      </div>
    );
  }

  return (
    <div className="shadow-soft gradient-accent rounded-[20px] p-6 text-white">
      <p className="text-[13px] font-medium text-white/80">You&apos;re paying, every year</p>
      <p className="mt-1 text-[44px] leading-none font-bold tabular-nums">€{annualCost.toFixed(0)}</p>
      <p className="mt-2 text-[14px] text-white/85">
        €{monthlyCost.toFixed(2)}/month across {count} recurring item{count === 1 ? "" : "s"}
      </p>
    </div>
  );
}
