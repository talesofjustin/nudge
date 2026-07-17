export type DatePreset = "week" | "month" | "quarter" | "all";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday-based week
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfQuarter(d: Date): Date {
  const quarter = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), quarter * 3, 1);
}

export function getPresetRange(preset: DatePreset): { from: string | null; to: string | null } {
  if (preset === "all") return { from: null, to: null };

  const now = new Date();
  const to = toISODate(now);

  if (preset === "week") return { from: toISODate(startOfWeek(now)), to };
  if (preset === "month") return { from: toISODate(startOfMonth(now)), to };
  return { from: toISODate(startOfQuarter(now)), to };
}
