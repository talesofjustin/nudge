import type { DatePreset } from "@/lib/date-presets";

export type FiltersState = {
  period: DatePreset | "custom";
  dateFrom: string;
  dateTo: string;
  spaceId: string | null;
  accountId: string | null;
  categoryIds: string[];
  amountMin: string;
  amountMax: string;
  recipient: string | null;
};

export type SearchParamsInput = { [key: string]: string | string[] | undefined };

const VALID_PERIODS = ["month", "quarter", "year", "custom"] as const;

function firstValue(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

// Both `period` (which preset button is highlighted) and the resolved
// `from`/`to` dates are stored in the URL: `period` drives the UI, while
// `from`/`to` make the link a stable, bookmarkable snapshot rather than a
// rolling "whatever today's month is" range.
export function parseFiltersFromParams(
  params: SearchParamsInput,
  defaultRange: { from: string; to: string },
): FiltersState {
  const rawPeriod = firstValue(params.period);
  const period = (VALID_PERIODS as readonly string[]).includes(rawPeriod ?? "")
    ? (rawPeriod as FiltersState["period"])
    : "month";

  const categoriesRaw = firstValue(params.categories);

  return {
    period,
    dateFrom: firstValue(params.from) ?? defaultRange.from,
    dateTo: firstValue(params.to) ?? defaultRange.to,
    spaceId: firstValue(params.space),
    accountId: firstValue(params.account),
    categoryIds: categoriesRaw ? categoriesRaw.split(",").filter(Boolean) : [],
    amountMin: firstValue(params.amountMin) ?? "",
    amountMax: firstValue(params.amountMax) ?? "",
    recipient: firstValue(params.recipient),
  };
}

export function filtersToSearchParams(filters: FiltersState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("period", filters.period);
  params.set("from", filters.dateFrom);
  params.set("to", filters.dateTo);
  if (filters.spaceId) params.set("space", filters.spaceId);
  if (filters.accountId) params.set("account", filters.accountId);
  if (filters.categoryIds.length > 0) params.set("categories", filters.categoryIds.join(","));
  if (filters.amountMin) params.set("amountMin", filters.amountMin);
  if (filters.amountMax) params.set("amountMax", filters.amountMax);
  if (filters.recipient) params.set("recipient", filters.recipient);
  return params;
}
