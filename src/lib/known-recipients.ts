export type KnownRecipient = { recipient: string; isOwnAccount: boolean };

export function normalizeRecipient(recipient: string): string {
  return recipient.trim().toLowerCase();
}

const normalize = normalizeRecipient;

// Recipient matching is case-insensitive so the same bank export showing up
// with slightly different casing across statements still matches a flag
// made from any one of them.
export function buildOwnAccountSet(knownRecipients: KnownRecipient[]): Set<string> {
  const set = new Set<string>();
  for (const kr of knownRecipients) {
    if (kr.isOwnAccount) set.add(normalize(kr.recipient));
  }
  return set;
}

export function isTransferRecipient(
  recipient: string | null,
  ownAccountRecipients: Set<string>,
): boolean {
  if (!recipient) return false;
  return ownAccountRecipients.has(normalize(recipient));
}
