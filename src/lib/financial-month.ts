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
