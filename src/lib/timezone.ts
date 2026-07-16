// "City GMT+X" labels for IANA timezone identifiers. Offsets are computed
// from the current date (not hardcoded) so they stay correct across DST.

export function formatTimezoneLabel(tz: string, now: Date = new Date()): string {
  if (tz === "UTC") return "UTC";

  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  }).formatToParts(now);
  const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "";

  return offset ? `${city} ${offset}` : city;
}

export type TimezoneOption = { value: string; label: string };

export function getTimezoneOptions(): TimezoneOption[] {
  const zones: string[] =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : ["UTC"];

  const now = new Date();
  return zones
    .map((tz) => ({ value: tz, label: formatTimezoneLabel(tz, now) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
