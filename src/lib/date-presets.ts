import { getFinancialMonthRange } from "@/lib/financial-month";

export type DatePreset = "month" | "quarter" | "year";

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfQuarter(d: Date): Date {
  const quarter = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), quarter * 3, 1);
}

function endOfQuarter(d: Date): Date {
  const quarter = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), quarter * 3 + 3, 0);
}

// "This month" is anchored to the user's payday (anchorDay); quarter/year
// stay on the calendar grid — payday-anchoring those is a fuzzier concept
// nobody asked for.
export function getPresetRange(
  preset: DatePreset,
  anchorDay: number | null | undefined = 1,
  reference: Date = new Date(),
): { from: string; to: string } {
  if (preset === "month") return getFinancialMonthRange(reference, anchorDay);

  if (preset === "quarter") {
    return { from: toISODate(startOfQuarter(reference)), to: toISODate(endOfQuarter(reference)) };
  }

  return {
    from: toISODate(new Date(reference.getFullYear(), 0, 1)),
    to: toISODate(new Date(reference.getFullYear(), 11, 31)),
  };
}
