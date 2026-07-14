import type { DecimalSeparator } from "@/lib/supabase/database.types";

export type ParsedRow = Record<string, string>;

export type ColumnMapping = {
  date: string | null;
  amount: string | null;
  recipient: string | null;
  description: string | null;
  // Optional debit/credit indicator column (e.g. ING's "Af Bij", or a
  // generic "Debit/Credit" column). When set, its value overrides whatever
  // sign the amount column itself has.
  sign: string | null;
};

const DATE_HINTS = ["date", "datum", "posted", "transaction date"];
const AMOUNT_HINTS = ["amount", "bedrag", "value", "debit", "credit", "total"];
const RECIPIENT_HINTS = ["payee", "recipient", "merchant", "naam", "name"];
const DESCRIPTION_HINTS = ["description", "mededeling", "memo", "note", "details"];
const SIGN_HINTS = ["af bij", "af/bij", "debit/credit", "credit/debit", "dr/cr", "cr/dr", "type"];

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
    sign: guessColumn(headers, SIGN_HINTS),
  };
}

// Distinct non-empty values seen in a column — used to populate the
// "which value means expense" picker once a sign column is chosen.
export function distinctValues(rows: ParsedRow[], column: string): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = row[column]?.trim();
    if (value) seen.add(value);
  }
  return Array.from(seen);
}

const EXPENSE_VALUE_HINTS = ["af", "debit", "dr", "out", "withdrawal", "expense", "d"];

// Best-effort guess at which distinct sign-column value means "money out".
// Always user-confirmable/overridable in the mapping step.
export function guessExpenseValue(values: string[]): string | null {
  const lower = values.map((v) => v.toLowerCase().trim());
  for (const hint of EXPENSE_VALUE_HINTS) {
    const idx = lower.findIndex((v) => v === hint);
    if (idx !== -1) return values[idx];
  }
  return values[0] ?? null;
}

// Scans sample values to guess whether "," or "." is the decimal separator.
// Returns null when inconclusive (e.g. all-integer amounts) rather than
// silently guessing — callers should fall back to a stored preference.
export function guessDecimalSeparator(samples: string[]): DecimalSeparator | null {
  let commaScore = 0;
  let periodScore = 0;

  for (const raw of samples) {
    const value = raw?.trim();
    if (!value) continue;
    const lastComma = value.lastIndexOf(",");
    const lastPeriod = value.lastIndexOf(".");
    if (lastComma === -1 && lastPeriod === -1) continue;

    if (lastComma > lastPeriod) {
      const decimals = value.length - lastComma - 1;
      if (decimals >= 1 && decimals <= 2) commaScore++;
    } else if (lastPeriod > lastComma) {
      const decimals = value.length - lastPeriod - 1;
      if (decimals >= 1 && decimals <= 2) periodScore++;
    }
  }

  if (commaScore === 0 && periodScore === 0) return null;
  return commaScore > periodScore ? "comma" : "period";
}

// Tolerant amount parser: strips currency symbols/whitespace, treats
// parenthesised values as negative (accounting notation), and interprets
// "," vs "." as the decimal separator per the caller's locale setting.
export function parseAmount(
  raw: string | undefined,
  decimalSeparator: DecimalSeparator = "period",
): number | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;

  let negative = false;
  if (value.startsWith("(") && value.endsWith(")")) {
    negative = true;
    value = value.slice(1, -1);
  }

  value = value.replace(/[^0-9.,\-+]/g, "");
  if (!value) return null;

  value =
    decimalSeparator === "comma"
      ? value.replace(/\./g, "").replace(",", ".")
      : value.replace(/,/g, "");

  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return negative ? -Math.abs(parsed) : parsed;
}

// Tolerant date parser. Handles ISO (YYYY-MM-DD), unseparated YYYYMMDD (e.g.
// ING NL exports), and MM/DD/YYYY explicitly, then falls back to the native
// parser for anything else recognisable (e.g. "Jan 5, 2026"). Slash-separated
// dates are assumed US-style (MM/DD/YYYY) — genuinely ambiguous otherwise.
// `timezone` (an IANA identifier) only affects the free-text fallback branch:
// the explicit patterns parse calendar digits directly and are timezone-
// independent.
export function parseDate(raw: string | undefined, timezone = "UTC"): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/;
  if (iso.test(value)) {
    const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const compact = /^(\d{4})(\d{2})(\d{2})$/;
  const compactMatch = value.match(compact);
  if (compactMatch) {
    const [, y, m, d] = compactMatch;
    const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
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

  const fallback = new Date(value);
  if (!Number.isNaN(fallback.getTime())) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(fallback);
      const y = parts.find((p) => p.type === "year")?.value;
      const m = parts.find((p) => p.type === "month")?.value;
      const d = parts.find((p) => p.type === "day")?.value;
      if (y && m && d) {
        const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
        if (!Number.isNaN(date.getTime())) return date.toISOString();
      }
    } catch {
      // Invalid/unrecognised timezone identifier — fall through to UTC.
    }
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

export type MapRowsOptions = {
  decimalSeparator: DecimalSeparator;
  timezone: string;
  // Which value in the sign column means "money out". Null = ignore the
  // sign column (if any) and trust the amount column's own sign.
  expenseValue: string | null;
};

export type MappedRow = {
  raw: ParsedRow;
  date: string | null;
  amount: number | null;
  recipient: string | null;
  description: string | null;
  valid: boolean;
};

export function mapRows(
  rows: ParsedRow[],
  mapping: ColumnMapping,
  options: MapRowsOptions,
): MappedRow[] {
  return rows.map((raw) => {
    const date = mapping.date ? parseDate(raw[mapping.date], options.timezone) : null;
    let amount = mapping.amount
      ? parseAmount(raw[mapping.amount], options.decimalSeparator)
      : null;

    if (amount !== null && mapping.sign && options.expenseValue !== null) {
      const signValue = raw[mapping.sign]?.trim();
      const isExpense = signValue === options.expenseValue;
      amount = isExpense ? -Math.abs(amount) : Math.abs(amount);
    }

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
