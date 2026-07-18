function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function PeriodBanner({
  period,
  dateFrom,
  dateTo,
}: {
  period: "month" | "quarter" | "year" | "custom";
  dateFrom: string;
  dateTo: string;
}) {
  let label: string;

  if (period === "custom") {
    label = `${formatDay(dateFrom)} – ${formatDay(dateTo)}`;
  } else {
    const from = new Date(`${dateFrom}T00:00:00Z`);
    const to = new Date(`${dateTo}T00:00:00Z`);
    const sameMonth = from.getUTCMonth() === to.getUTCMonth() && from.getUTCFullYear() === to.getUTCFullYear();
    if (period === "month" && sameMonth) {
      label = from.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
    } else {
      label = `${formatDay(dateFrom)} – ${formatDay(dateTo)}`;
    }
  }

  return (
    <p className="text-[15px] font-medium text-foreground">
      Showing: <span className="text-violet-600">{label}</span>
    </p>
  );
}
