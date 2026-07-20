import { createClient } from "@/lib/supabase/server";
import { identityKey } from "@/lib/counterparty-identity";
import type { ImportCheckContext, ImportFlag } from "./types";

export const CHECK_ID = "category-suggestion";

// A recipient with no explicit rule but a strong historical pattern (same
// category 3+ times) is worth surfacing as a one-click suggestion — short
// of a rule, but better than re-categorising it by hand every import.
export async function run(ctx: ImportCheckContext): Promise<ImportFlag[]> {
  const distinctRecipients = Array.from(
    new Set(ctx.rows.map((r) => r.recipient).filter((r): r is string => !!r)),
  );
  if (distinctRecipients.length === 0) return [];

  const supabase = await createClient();

  const [{ data: existingRules }, { data: categories }, { data: history }] = await Promise.all([
    supabase.from("recipient_category_rules").select("identity_key").eq("user_id", ctx.userId),
    supabase.from("categories").select("id, name").eq("user_id", ctx.userId),
    supabase
      .from("transactions")
      .select("recipient, counterparty_iban, category_id")
      .eq("user_id", ctx.userId)
      .in("recipient", distinctRecipients)
      .not("category_id", "is", null),
  ]);

  const hasRule = new Set((existingRules ?? []).map((r) => r.identity_key));
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const countsByRecipient = new Map<string, Map<string, number>>();
  const ibanByKey = new Map<string, string | null>();
  for (const tx of history ?? []) {
    if (!tx.recipient || !tx.category_id) continue;
    const key = identityKey({ recipient: tx.recipient, counterpartyIban: tx.counterparty_iban });
    if (!key || hasRule.has(key)) continue;
    ibanByKey.set(key, tx.counterparty_iban);
    const inner = countsByRecipient.get(key) ?? new Map<string, number>();
    inner.set(tx.category_id, (inner.get(tx.category_id) ?? 0) + 1);
    countsByRecipient.set(key, inner);
  }

  const flags: ImportFlag[] = [];
  for (const [key, counts] of countsByRecipient) {
    let bestCategoryId: string | null = null;
    let bestCount = 0;
    for (const [categoryId, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestCategoryId = categoryId;
      }
    }
    if (bestCategoryId && bestCount >= 3) {
      const recipient =
        ctx.rows.find(
          (r) => identityKey({ recipient: r.recipient, counterpartyIban: r.counterpartyIban }) === key,
        )?.recipient ?? key;
      const categoryName = categoryNameById.get(bestCategoryId) ?? "this category";
      flags.push({
        id: `category-suggestion:${key}`,
        checkId: CHECK_ID,
        title: "Category suggestion",
        message: `${recipient} has been categorised ${categoryName} ${bestCount} times — always categorise it that way?`,
        actions: [
          { id: "dismiss", label: "Not now", variant: "secondary" },
          { id: "confirm", label: `Yes, always ${categoryName}`, variant: "primary" },
        ],
        data: { recipient, categoryId: bestCategoryId, counterpartyIban: ibanByKey.get(key) ?? "" },
        blocking: false,
      });
    }
  }

  return flags;
}
