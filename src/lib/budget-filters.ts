export type BudgetMonth = { from: string; to: string };

export type SearchParamsInput = { [key: string]: string | string[] | undefined };

function firstValue(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

// Same pattern as transaction-filters.ts: the resolved from/to dates are
// stored in the URL (not just "current month"), so a link always shows the
// same financial month when revisited rather than rolling forward.
export function parseBudgetMonthFromParams(
  params: SearchParamsInput,
  defaultMonth: BudgetMonth,
): BudgetMonth {
  return {
    from: firstValue(params.from) ?? defaultMonth.from,
    to: firstValue(params.to) ?? defaultMonth.to,
  };
}

export function budgetMonthToSearchParams(month: BudgetMonth): URLSearchParams {
  const params = new URLSearchParams();
  params.set("from", month.from);
  params.set("to", month.to);
  return params;
}
