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

// Case-insensitive: real exports aren't perfectly consistent about casing,
// and a missed match here is exactly what causes the "only one field
// shows" bug (see below).
const KEY_PATTERN = new RegExp(`(${KNOWN_KEYS.join("|")}):\\s*`, "gi");

// Text before the first recognized key is currently discarded outright —
// if a transaction's actual label text doesn't match our known list (a
// different template, a typo, unexpected casing we still missed), whatever
// came before the first key we DID recognize vanishes silently, and the
// user is left looking at a single stray field like "Valutadatum" with no
// indication that more was there. A little boilerplate prefix (e.g. "SEPA
// Overboeking") is normal and fine to drop; anything longer means we're
// probably missing real content, so we bail out to the raw-text fallback
// instead of presenting a confidently-wrong, near-empty panel.
const MAX_UNRECOGNIZED_PREFIX = 20;

// Returns labeled fields when the raw text matches the known key:value
// pattern with reasonable confidence, or null when it doesn't (callers
// should fall back to showing the raw text as-is).
export function parseRawDescription(raw: string): ParsedDescriptionField[] | null {
  const matches = [...raw.matchAll(KEY_PATTERN)];
  if (matches.length === 0) return null;

  const leadingText = raw.slice(0, matches[0].index ?? 0).trim();
  if (leadingText.length > MAX_UNRECOGNIZED_PREFIX) return null;

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

// Both helpers below reuse the same field extraction as the display
// parser — if we can't confidently parse the structure, we shouldn't
// trust field extraction either, so they share its bail-out behavior.
export function extractCounterpartyIban(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const fields = parseRawDescription(raw);
  const match = fields?.find((f) => f.label.toLowerCase() === "iban");
  return match ? match.value.trim() : null;
}

const DATUM_TIJD_PATTERN = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/;

// Returns just the time-of-day ("HH:MM:SS") — the date portion of
// "Datum/Tijd" is redundant with the mapped date column and only the time
// is missing from occurred_at today.
export function extractTransactionTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const fields = parseRawDescription(raw);
  const match = fields?.find((f) => f.label.toLowerCase() === "datum/tijd");
  if (!match) return null;
  const m = match.value.match(DATUM_TIJD_PATTERN);
  if (!m) return null;
  const [, , , , hh, mm, ss] = m;
  return `${hh}:${mm}:${ss}`;
}
