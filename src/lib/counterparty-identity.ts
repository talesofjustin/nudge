// Recipient names are ambiguous (two different "J. de Vries"), bank
// account numbers aren't. Every place that needs to recognize "the same
// counterparty again" — rules, transfer detection, duplicate matching,
// recurring grouping — should use this single precedence: IBAN when both
// sides have one, the recipient name otherwise. Mirrors the identity_key
// generated column on the rule tables so app-layer lookups and DB
// constraints agree on what "the same counterparty" means.
export type Counterparty = { recipient: string | null; counterpartyIban?: string | null };

export function normalizeRecipient(recipient: string): string {
  return recipient.trim().toLowerCase();
}

export function normalizeIban(iban: string): string {
  return iban.replace(/\s+/g, "").toUpperCase();
}

// Null when there's neither an IBAN nor a recipient to key on (nothing to
// identify this counterparty by at all).
export function identityKey(counterparty: Counterparty): string | null {
  if (counterparty.counterpartyIban) return normalizeIban(counterparty.counterpartyIban);
  if (counterparty.recipient) return normalizeRecipient(counterparty.recipient);
  return null;
}

// The ONLY fields that make two transactions "the same transaction" for
// duplicate-detection purposes, both on import and in the cleanup tool.
// Deliberately excludes everything a user or the app applies after the
// fact — category, category_source, reviewed_at, book, note/description —
// since a transaction categorised (or re-noted) after import must still be
// recognized as a duplicate when the same statement is re-imported. Using
// description as a tiebreaker was the actual cause of a real bug: editing
// a note between imports silently broke re-import dedup for that row.
export function transactionMatchKey(tx: {
  occurredAt: string;
  hasPreciseTime: boolean;
  amount: number;
  recipient: string | null;
  counterpartyIban?: string | null;
}): string {
  const counterparty = identityKey({ recipient: tx.recipient, counterpartyIban: tx.counterpartyIban }) ?? "";
  const dateComponent = tx.hasPreciseTime ? tx.occurredAt : tx.occurredAt.slice(0, 10);
  return `${dateComponent}|${tx.amount}|${counterparty}`;
}
