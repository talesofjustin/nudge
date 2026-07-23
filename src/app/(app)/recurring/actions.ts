"use server";

import { createClient } from "@/lib/supabase/server";
import { confirmRecurringGroup, dismissRecurringGroup, recomputeRecurringGroups, OUTLIER_THRESHOLD } from "@/lib/recurring";
import { buildOwnAccountSet, isTransferRecipient } from "@/lib/known-recipients";
import type { RecurringGroupStatus } from "@/lib/supabase/database.types";

export type RecurringOccurrence = {
  id: string;
  occurredAt: string;
  amount: number;
  isOutlier: boolean;
};

export type PriceIncrease = {
  oldAmount: number;
  newAmount: number;
  changedAt: string;
};

export type RecurringItem = {
  groupId: string;
  label: string;
  intervalDays: number;
  typicalAmount: number;
  status: RecurringGroupStatus;
  categoryId: string | null;
  accountId: string | null;
  lastChargedAt: string;
  nextExpectedAt: string;
  monthlyCost: number;
  annualCost: number;
  occurrences: RecurringOccurrence[];
  priceIncrease: PriceIncrease | null;
  isStale: boolean;
};

const DAYS_PER_MONTH = 365.25 / 12;
const STALE_INTERVAL_MULTIPLIER = 2;
const PRICE_INCREASE_THRESHOLD = 0.1;

function mostCommon<T>(values: T[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [v, count] of counts) {
    if (count > bestCount) {
      best = v;
      bestCount = count;
    }
  }
  return best;
}

export async function getRecurringItems(): Promise<RecurringItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Rebuild groups on every visit rather than only after import — cheap
  // relative to a page load, and it's what makes the amount-clustering
  // reset migration actually take effect without requiring a fresh import.
  await recomputeRecurringGroups(user.id);

  const { data: groups } = await supabase
    .from("recurring_groups")
    .select("id, label, interval_days, typical_amount, status")
    .eq("user_id", user.id)
    .in("status", ["detected", "confirmed"]);

  if (!groups || groups.length === 0) return [];

  const groupIds = groups.map((g) => g.id);
  const [{ data: transactions }, { data: knownRecipients }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, occurred_at, amount, category_id, account_id, recurring_group_id, recipient, counterparty_iban")
      .eq("user_id", user.id)
      .in("recurring_group_id", groupIds),
    supabase.from("known_recipients").select("recipient, counterparty_iban, is_own_account").eq("user_id", user.id),
  ]);

  const ownAccountKeys = buildOwnAccountSet(
    (knownRecipients ?? []).map((kr) => ({
      recipient: kr.recipient,
      counterpartyIban: kr.counterparty_iban,
      isOwnAccount: kr.is_own_account,
    })),
  );

  const txByGroup = new Map<string, typeof transactions>();
  for (const tx of transactions ?? []) {
    if (!tx.recurring_group_id) continue;
    const list = txByGroup.get(tx.recurring_group_id) ?? [];
    list.push(tx);
    txByGroup.set(tx.recurring_group_id, list);
  }

  const now = Date.now();

  const items: RecurringItem[] = [];
  for (const group of groups) {
    const groupTx = (txByGroup.get(group.id) ?? []).slice().sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
    if (groupTx.length === 0) continue;

    // This page exists to find costs to cut — income and transfers
    // between the user's own accounts are neither. Filtered here (display
    // only): is_recurring / recurring_groups still apply to income, since
    // Budget, Dashboard and Wishlist need predictable revenue later.
    const representative = groupTx[groupTx.length - 1];
    const isTransfer = isTransferRecipient(
      { recipient: representative.recipient, counterpartyIban: representative.counterparty_iban },
      ownAccountKeys,
    );
    if (group.typical_amount >= 0 || isTransfer) continue;

    const occurrences: RecurringOccurrence[] = groupTx.map((tx) => ({
      id: tx.id,
      occurredAt: tx.occurred_at,
      amount: tx.amount,
      isOutlier:
        group.typical_amount !== 0 &&
        Math.abs(tx.amount - group.typical_amount) / Math.abs(group.typical_amount) > OUTLIER_THRESHOLD,
    }));

    const lastChargedAt = groupTx[groupTx.length - 1].occurred_at;
    const nextExpectedAt = new Date(
      new Date(lastChargedAt).getTime() + group.interval_days * 86_400_000,
    ).toISOString();

    const monthlyCost = Math.abs(group.typical_amount) * (DAYS_PER_MONTH / group.interval_days);
    const annualCost = Math.abs(group.typical_amount) * (365.25 / group.interval_days);

    // Compare the latest occurrence against the median of everything
    // before it — a lone recent jump that's still within outlier bounds
    // (or even the new typical, once enough later charges land) reads as
    // a genuine price change rather than a one-off blip.
    let priceIncrease: PriceIncrease | null = null;
    if (groupTx.length >= 2) {
      const latest = groupTx[groupTx.length - 1];
      const prior = groupTx.slice(0, -1).map((t) => t.amount);
      const priorSorted = [...prior].sort((a, b) => a - b);
      const priorMedian = priorSorted[Math.floor(priorSorted.length / 2)];
      if (priorMedian !== 0 && Math.abs(latest.amount) > Math.abs(priorMedian) * (1 + PRICE_INCREASE_THRESHOLD)) {
        priceIncrease = { oldAmount: priorMedian, newAmount: latest.amount, changedAt: latest.occurred_at };
      }
    }

    const daysSinceLast = (now - new Date(lastChargedAt).getTime()) / 86_400_000;
    const isStale = daysSinceLast > group.interval_days * STALE_INTERVAL_MULTIPLIER;

    items.push({
      groupId: group.id,
      label: group.label,
      intervalDays: group.interval_days,
      typicalAmount: group.typical_amount,
      status: group.status,
      categoryId: mostCommon(groupTx.map((t) => t.category_id)),
      accountId: mostCommon(groupTx.map((t) => t.account_id)),
      lastChargedAt,
      nextExpectedAt,
      monthlyCost,
      annualCost,
      occurrences,
      priceIncrease,
      isStale,
    });
  }

  return items.sort((a, b) => b.monthlyCost - a.monthlyCost);
}

export async function confirmRecurring(groupId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };
  return confirmRecurringGroup(user.id, groupId);
}

export async function dismissRecurring(groupId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };
  return dismissRecurringGroup(user.id, groupId);
}
