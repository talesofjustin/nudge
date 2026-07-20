import { identityKey, type Counterparty } from "@/lib/counterparty-identity";

// Three-layer resolution, read-only: callers decide when to persist the
// result. Explicit transaction-level assignment always wins; then a
// recipient rule (matched by identity — IBAN first, recipient name
// otherwise); then the account's default; otherwise unassigned.
export function resolveBookId(inputs: {
  transactionBookId: string | null;
  counterparty: Counterparty;
  accountDefaultBookId: string | null;
  recipientRules: Map<string, string>;
}): string | null {
  if (inputs.transactionBookId) return inputs.transactionBookId;

  const key = identityKey(inputs.counterparty);
  if (key) {
    const rule = inputs.recipientRules.get(key);
    if (rule) return rule;
  }

  if (inputs.accountDefaultBookId) return inputs.accountDefaultBookId;

  return null;
}

export function buildRecipientBookRuleMap(
  rules: { recipient: string; counterpartyIban?: string | null; bookId: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const rule of rules) {
    const key = identityKey({ recipient: rule.recipient, counterpartyIban: rule.counterpartyIban });
    if (key) map.set(key, rule.bookId);
  }
  return map;
}

export function buildRecipientCategoryRuleMap(
  rules: { recipient: string; counterpartyIban?: string | null; categoryId: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const rule of rules) {
    const key = identityKey({ recipient: rule.recipient, counterpartyIban: rule.counterpartyIban });
    if (key) map.set(key, rule.categoryId);
  }
  return map;
}
