export type ParsedDescriptionField = { label: string; value: string };

// ING NL (and similar) exports cram several fields into one free-text
// column, e.g. "Naam: FOO Omschrijving: BAR IBAN: NL00BANK0123456789
// Datum/Tijd: 01-06-2026 12:00:00". Known label words followed by a colon
// mark field boundaries; each field's value runs until the next known
// label or the end of the string.
const KNOWN_KEYS = [
  "Naam",
  "Omschrijving",
  "IBAN",
  "Datum/Tijd",
  "Kenmerk",
  "Machtiging ID",
  "Incassant ID",
  "Valutadatum",
];

const KEY_PATTERN = new RegExp(`(${KNOWN_KEYS.join("|")}):\\s*`, "g");

// Returns labeled fields when the raw text matches the known key:value
// pattern, or null when it doesn't (callers should fall back to showing the
// raw text as-is).
export function parseRawDescription(raw: string): ParsedDescriptionField[] | null {
  const matches = [...raw.matchAll(KEY_PATTERN)];
  if (matches.length === 0) return null;

  const fields: ParsedDescriptionField[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const key = match[1];
    const valueStart = (match.index ?? 0) + match[0].length;
    const valueEnd = i + 1 < matches.length ? (matches[i + 1].index ?? raw.length) : raw.length;
    const value = raw.slice(valueStart, valueEnd).trim();
    if (value) fields.push({ label: key, value });
  }
  return fields.length > 0 ? fields : null;
}
