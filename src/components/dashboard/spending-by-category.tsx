import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

// TODO: replace with real category aggregates once transactions/labels exist.
const CATEGORIES = [
  { label: "Groceries", pct: 62, value: 482, active: true },
  { label: "Dining out", pct: 45, value: 310, active: false },
  { label: "Transport", pct: 30, value: 198, active: false },
  { label: "Shopping", pct: 22, value: 145, active: false },
  { label: "Subscriptions", pct: 15, value: 89, active: false },
];

export function SpendingByCategory() {
  return (
    <Card>
      <h2 className="text-[15px] font-semibold text-ink">Spending by category</h2>

      <div className="mt-10 flex flex-col gap-6">
        {CATEGORIES.map((c) => (
          <div key={c.label} className="flex items-center gap-4">
            <span className="w-28 shrink-0 text-[13px] font-medium text-muted">
              {c.label}
            </span>

            <div className="relative h-3 flex-1 rounded-full bg-canvas">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${
                  c.active ? "gradient-accent" : "bg-border"
                }`}
                style={{ width: `${c.pct}%` }}
              />
              {c.active && (
                <div
                  className="shadow-soft absolute -top-9 flex -translate-x-1/2 items-center rounded-lg bg-ink px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-white"
                  style={{ left: `${c.pct}%` }}
                >
                  ${c.value}
                  <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 rounded-[2px] bg-ink" />
                </div>
              )}
            </div>

            <div className="flex w-16 shrink-0 justify-end">
              {!c.active && <Pill>${c.value}</Pill>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
