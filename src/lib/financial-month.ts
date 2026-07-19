// Computes "financial month" boundaries anchored to a payday rather than the
// calendar month. Anchor day 1 (or unset) behaves exactly like a calendar
// month. Centralized here so every "this month" computation (transactions
// period selector, future budget/summary views) agrees on the same rule.

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Clamps the anchor day to the last actual day of the given month (e.g.
// anchor 31 in February becomes the 28th/29th).
function anchorDateInMonth(year: number, monthIndex: number, anchor: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(anchor, lastDay));
}

export function getFinancialMonthRange(
  reference: Date,
  anchorDay: number | null | undefined,
): { from: string; to: string } {
  const anchor = Math.min(Math.max(Math.floor(anchorDay ?? 1) || 1, 1), 31);

  const y = reference.getFullYear();
  const m = reference.getMonth();
  const currentAnchor = anchorDateInMonth(y, m, anchor);

  const start =
    reference.getDate() >= currentAnchor.getDate()
      ? currentAnchor
      : anchorDateInMonth(y, m - 1, anchor);

  const nextAnchor = anchorDateInMonth(start.getFullYear(), start.getMonth() + 1, anchor);
  const end = new Date(nextAnchor);
  end.setDate(end.getDate() - 1);

  return { from: toISODate(start), to: toISODate(end) };
}

function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Steps to the adjacent financial month — a day past the current range's end
// (for "next") or a day before its start (for "prev") always lands inside
// the neighbouring period, so re-running getFinancialMonthRange from there
// resolves the correct boundaries regardless of month length.
export function shiftFinancialMonth(
  current: { from: string; to: string },
  anchorDay: number | null | undefined,
  direction: "prev" | "next",
): { from: string; to: string } {
  const reference =
    direction === "next" ? fromISODate(current.to) : fromISODate(current.from);
  reference.setDate(reference.getDate() + (direction === "next" ? 1 : -1));
  return getFinancialMonthRange(reference, anchorDay);
}

// The budgets table keys rows by a calendar-month date (its `month` column
// requires date_trunc('month', month) = month). A financial month is
// labeled by the calendar month it starts in — for the common case
// (anchor day 1, or unset) this is identical to the financial month itself,
// since the two already coincide.
export function financialMonthBudgetKey(financialMonthFrom: string): string {
  return `${financialMonthFrom.slice(0, 7)}-01`;
}
