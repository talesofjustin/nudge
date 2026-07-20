import { normalizeRecipient } from "@/lib/known-recipients";

// Three-layer resolution, read-only: callers decide when to persist the
// result. Explicit transaction-level assignment always wins; then a
// recipient rule; then the account's default; otherwise unassigned.
export function resolveBookId(inputs: {
  transactionBookId: string | null;
  recipient: string | null;
  accountDefaultBookId: string | null;
  recipientRules: Map<string, string>;
}): string | null {
  if (inputs.transactionBookId) return inputs.transactionBookId;

  if (inputs.recipient) {
    const rule = inputs.recipientRules.get(normalizeRecipient(inputs.recipient));
    if (rule) return rule;
  }

  if (inputs.accountDefaultBookId) return inputs.accountDefaultBookId;

  return null;
}

export function buildRecipientBookRuleMap(
  rules: { recipient: string; bookId: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const rule of rules) {
    map.set(normalizeRecipient(rule.recipient), rule.bookId);
  }
  return map;
}

export function buildRecipientCategoryRuleMap(
  rules: { recipient: string; categoryId: string }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const rule of rules) {
    map.set(normalizeRecipient(rule.recipient), rule.categoryId);
  }
  return map;
}
