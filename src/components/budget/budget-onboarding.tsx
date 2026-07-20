import { Button } from "@/components/ui/button";

// Shown in place of the budgeted/spent/remaining trio when nothing is
// budgeted yet this month — a bare "€0 budgeted / -€X remaining" reads as
// being thousands over budget, which is alarming and wrong. "Remaining"
// only means something once a budget actually exists.
export function BudgetOnboarding({
  lastMonthSpent,
  onSetup,
}: {
  lastMonthSpent: number | null;
  onSetup: () => void;
}) {
  return (
    <div className="border-b border-border px-4 py-8 text-center">
      <p className="text-[14.5px] font-semibold text-foreground">No budgets set for this month</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] text-muted">
        A budget is an amount you plan to spend per category — set one and this page shows how
        close you are to it as the month goes.
      </p>
      {lastMonthSpent !== null && lastMonthSpent > 0 && (
        <p className="mt-3 text-[13px] text-muted">
          For context, you spent <span className="font-semibold text-foreground">€{lastMonthSpent.toFixed(2)}</span>{" "}
          last month.
        </p>
      )}
      <Button type="button" className="mt-4" onClick={onSetup}>
        Set up budgets
      </Button>
    </div>
  );
}
