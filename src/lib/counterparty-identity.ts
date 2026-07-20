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
