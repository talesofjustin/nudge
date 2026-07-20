import { createClient } from "@/lib/supabase/server";
import { identityKey } from "@/lib/counterparty-identity";
import type { FlagItem, ImportCheckContext, ImportFlag } from "./types";

export const CHECK_ID = "transfer-detection";

type RecipientAgg = { recipient: string; counterpartyIban: string | null; inCount: number; outCount: number };

function addToAgg(
  map: Map<string, RecipientAgg>,
  counterparty: { recipient: string | null; counterpartyIban?: string | null },
  amount: number,
): void {
  const key = identityKey(counterparty);
  if (!key || !counterparty.recipient) return;
  const existing =
    map.get(key) ?? {
      recipient: counterparty.recipient,
      counterpartyIban: counterparty.counterpartyIban ?? null,
      inCount: 0,
      outCount: 0,
    };
  if (amount > 0) existing.inCount++;
  else if (amount < 0) existing.outCount++;
  map.set(key, existing);
}

// Flags recipients with a back-and-forth pattern — money going both in and
// out with meaningful frequency — combining the rows being imported with the
// user's existing history for that recipient (history alone, or the new
// file alone, might not show the pattern; together they often do). Skips
// any counterparty the user has already made a decision about (a
// known_recipients row exists either way, true or false).
export async function run(ctx: ImportCheckContext): Promise<ImportFlag[]> {
  const distinctRecipients = Array.from(
    new Set(ctx.rows.map((r) => r.recipient).filter((r): r is string => !!r)),
  );
  if (distinctRecipients.length === 0) return [];

  const supabase = await createClient();

  const agg = new Map<string, RecipientAgg>();
  for (const row of ctx.rows) addToAgg(agg, row, row.amount);

  if (ctx.accountId) {
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("recipient, counterparty_iban, amount")
      .eq("user_id", ctx.userId)
      .in("recipient", distinctRecipients);
    for (const tx of existingTx ?? []) {
      addToAgg(agg, { recipient: tx.recipient, counterpartyIban: tx.counterparty_iban }, tx.amount);
    }
  }

  const { data: known } = await supabase
    .from("known_recipients")
    .select("identity_key")
    .eq("user_id", ctx.userId);
  const decided = new Set((known ?? []).map((k) => k.identity_key));

  const items: FlagItem[] = [];
  for (const [key, entry] of agg) {
    if (decided.has(key)) continue;
    if (entry.inCount >= 2 && entry.outCount >= 2) {
      items.push({
        id: `transfer:${key}`,
        label: entry.recipient,
        actions: [
          { id: "count", label: "Yes, count them normally", variant: "secondary" },
          { id: "exclude", label: "No, exclude them (it's a transfer)", variant: "primary" },
        ],
        data: { recipient: entry.recipient, counterpartyIban: entry.counterpartyIban ?? "" },
      });
    }
  }

  if (items.length === 0) return [];

  // Not blocking: this is a heads-up, not a warning — leaving a recipient
  // unresolved just means it's asked about again on the next import, so it
  // shouldn't hold up finishing this one.
  const flag: ImportFlag =
    items.length === 1
      ? {
          id: "transfer-detection",
          checkId: CHECK_ID,
          title: "Possible transfer account",
          message: `We noticed frequent transfers with ${items[0].label} — should these transactions count toward your income/expense totals?`,
          items,
          blocking: false,
        }
      : {
          id: "transfer-detection",
          checkId: CHECK_ID,
          title: "We noticed frequent back-and-forth with a few recipients",
          message:
            "For each one: should these transactions count toward your income/expense totals? Leave any you're unsure about and we'll ask again next import.",
          items,
          blocking: false,
        };

  return [flag];
}
