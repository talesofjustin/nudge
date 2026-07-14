export type ParsedRow = Record<string, string>;

export type ColumnMapping = {
  date: string | null;
  amount: string | null;
  recipient: string | null;
  description: string | null;
};

const DATE_HINTS = ["date", "posted", "transaction date"];
const AMOUNT_HINTS = ["amount", "value", "debit", "credit", "total"];
const RECIPIENT_HINTS = ["payee", "recipient", "merchant", "name"];
const DESCRIPTION_HINTS = ["description", "memo", "note", "details"];

function guessColumn(headers: string[], hints: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase());
  for (const hint of hints) {
    const idx = lower.findIndex((h) => h.includes(hint));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

export function guessColumnMapping(headers: string[]): ColumnMapping {
  return {
    date: guessColumn(headers, DATE_HINTS),
    amount: guessColumn(headers, AMOUNT_HINTS),
    recipient: guessColumn(headers, RECIPIENT_HINTS),
    description: guessColumn(headers, DESCRIPTION_HINTS),
  };
}

// Tolerant amount parser: strips currency symbols/commas/whitespace, treats
// parenthesised values as negative (common accounting notation).
export function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;

  let negative = false;
  if (value.startsWith("(") && value.endsWith(")")) {
    negative = true;
    value = value.slice(1, -1);
  }

  value = value.replace(/[^0-9.\-]/g, "");
  if (!value) return null;

  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return negative ? -Math.abs(parsed) : parsed;
}

// Tolerant date parser. Handles ISO (YYYY-MM-DD) and MM/DD/YYYY explicitly
// (the two most common bank export formats), then falls back to the native
// parser for anything else recognisable (e.g. "Jan 5, 2026"). Slash-separated
// dates are assumed US-style (MM/DD/YYYY) — genuinely ambiguous otherwise.
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/;
  if (iso.test(value)) {
    const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
  const slashMatch = value.match(slash);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    const year = y.length === 2 ? `20${y}` : y;
    const date = new Date(
      `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00Z`,
    );
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  // Native parsing interprets the string in local time, so rebuild as UTC
  // midnight of that same calendar date rather than converting directly —
  // otherwise the stored date can shift by a day depending on the browser's
  // timezone offset.
  const fallback = new Date(value);
  if (!Number.isNaN(fallback.getTime())) {
    const utc = new Date(
      Date.UTC(fallback.getFullYear(), fallback.getMonth(), fallback.getDate()),
    );
    return utc.toISOString();
  }

  return null;
}

function cleanField(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type MappedRow = {
  raw: ParsedRow;
  date: string | null;
  amount: number | null;
  recipient: string | null;
  description: string | null;
  valid: boolean;
};

export function mapRows(rows: ParsedRow[], mapping: ColumnMapping): MappedRow[] {
  return rows.map((raw) => {
    const date = mapping.date ? parseDate(raw[mapping.date]) : null;
    const amount = mapping.amount ? parseAmount(raw[mapping.amount]) : null;
    const recipient = mapping.recipient ? cleanField(raw[mapping.recipient]) : null;
    const description = mapping.description ? cleanField(raw[mapping.description]) : null;
    return {
      raw,
      date,
      amount,
      recipient,
      description,
      valid: date !== null && amount !== null,
    };
  });
}
