import { identityKey, normalizeRecipient, type Counterparty } from "@/lib/counterparty-identity";

export { normalizeRecipient };

export type KnownRecipient = {
  recipient: string;
  counterpartyIban?: string | null;
  isOwnAccount: boolean;
};

// Keyed by identity (IBAN when known, recipient name otherwise) so the
// same bank export showing up with slightly different recipient-name
// casing/formatting across statements still matches a flag made from any
// one of them, and a recipient name reused by two different counterparties
// doesn't wrongly share a flag once an IBAN is known for either.
export function buildOwnAccountSet(knownRecipients: KnownRecipient[]): Set<string> {
  const set = new Set<string>();
  for (const kr of knownRecipients) {
    if (!kr.isOwnAccount) continue;
    const key = identityKey({ recipient: kr.recipient, counterpartyIban: kr.counterpartyIban });
    if (key) set.add(key);
  }
  return set;
}

export function isTransferRecipient(
  counterparty: Counterparty,
  ownAccountKeys: Set<string>,
): boolean {
  const key = identityKey(counterparty);
  return key ? ownAccountKeys.has(key) : false;
}
