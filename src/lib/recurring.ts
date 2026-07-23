import { createClient } from "@/lib/supabase/server";
import { identityKey } from "@/lib/counterparty-identity";
import type { RecurringGroupStatus } from "@/lib/supabase/database.types";

// A recurring pattern is about rhythm, not amount — a salary with holiday
// pay must not look "broken". But the unit of recurrence is counterparty
// AND amount, not counterparty alone: a sender like a tax office can bill
// several genuinely different recurring amounts (motor tax, car tax), and
// those are separate recurring items, not one item with the others as
// "outliers". Occurrences for a counterparty are first clustered by
// amount (within AMOUNT_CLUSTER_TOLERANCE of each other); each cluster is
// then checked for a regular interval independently. "Outlier" only
// applies WITHIN an established cluster (e.g. a €1250 rent that was €1400
// once) — a different amount entirely just forms its own cluster/group.
//
// Detection is always a suggestion (recurring_groups.status starts
// 'detected') — a transaction's is_recurring flag only ever flips true
// once a human confirms, either by acting on the suggestion or by
// flagging a transaction recurring directly (which is its own
// confirmation and creates/attaches a 'confirmed' group immediately).

const MIN_OCCURRENCES = 3;
const MIN_INTERVAL_DAYS = 5;
const MAX_INTERVAL_DAYS = 400;
const INTERVAL_TOLERANCE = 0.3; // gaps within ±30% of the median count as "regular"
const MIN_REGULAR_FRACTION = 0.7; // at least 70% of gaps must fall in that band
export const OUTLIER_THRESHOLD = 0.25; // >25% off a cluster's typical amount = outlier within that cluster
const AMOUNT_CLUSTER_TOLERANCE = 0.1; // amounts within ~10% of each other form the same recurring item
const DEFAULT_INTERVAL_DAYS = 30; // fallback when a manual flag has too little history to infer a cadence

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
}

type Occurrence = { id: string; occurredAt: string; amount: number; recipient: string | null };

// Sequential clustering over amounts sorted ascending: an occurrence joins
// the current cluster if it's within tolerance of that cluster's running
// average, otherwise it starts a new one. Well-separated amounts (the
// whole point) produce well-separated clusters this way.
function clusterByAmount(occurrences: Occurrence[]): Occurrence[][] {
  const sorted = [...occurrences].sort((a, b) => a.amount - b.amount);
  const clusters: Occurrence[][] = [];
  let current: Occurrence[] = [];
  let currentSum = 0;

  for (const occ of sorted) {
    if (current.length === 0) {
      current = [occ];
      currentSum = occ.amount;
      continue;
    }
    const currentAvg = currentSum / current.length;
    const withinTolerance =
      currentAvg === 0
        ? occ.amount === 0
        : Math.abs(occ.amount - currentAvg) / Math.abs(currentAvg) <= AMOUNT_CLUSTER_TOLERANCE;
    if (withinTolerance) {
      current.push(occ);
      currentSum += occ.amount;
    } else {
      clusters.push(current);
      current = [occ];
      currentSum = occ.amount;
    }
  }
  if (current.length > 0) clusters.push(current);
  return clusters;
}

function detectInterval(occurrences: Occurrence[]): number | null {
  if (occurrences.length < MIN_OCCURRENCES) return null;
  const sorted = [...occurrences].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(daysBetween(sorted[i - 1].occurredAt, sorted[i].occurredAt));
  }

  const medianGap = median(gaps);
  if (medianGap < MIN_INTERVAL_DAYS || medianGap > MAX_INTERVAL_DAYS) return null;

  const inBand = gaps.filter(
    (g) => g >= medianGap * (1 - INTERVAL_TOLERANCE) && g <= medianGap * (1 + INTERVAL_TOLERANCE),
  ).length;
  if (inBand / gaps.length < MIN_REGULAR_FRACTION) return null;

  return Math.round(medianGap);
}

// A looser variant used only when a human has already manually flagged 2+
// occurrences recurring — the confidence bar is lower because the human
// already vouched for the pattern; this just estimates a cadence to show.
function estimateInterval(occurrences: Occurrence[]): number {
  if (occurrences.length < 2) return DEFAULT_INTERVAL_DAYS;
  const sorted = [...occurrences].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(daysBetween(sorted[i - 1].occurredAt, sorted[i].occurredAt));
  return Math.round(median(gaps)) || DEFAULT_INTERVAL_DAYS;
}

// Excludes outliers from the final typical amount, but the outlier test
// itself is relative to a first-pass median so one lone outlier can't
// drag the "typical" value toward itself.
function typicalAmount(occurrences: Occurrence[]): number {
  const amounts = occurrences.map((o) => o.amount);
  const firstPass = median(amounts);
  const inliers = amounts.filter(
    (a) => firstPass === 0 || Math.abs(a - firstPass) / Math.abs(firstPass) <= OUTLIER_THRESHOLD,
  );
  return median(inliers.length > 0 ? inliers : amounts);
}

function mostCommonLabel(occurrences: Occurrence[]): string {
  const counts = new Map<string, number>();
  for (const o of occurrences) {
    if (!o.recipient) continue;
    counts.set(o.recipient, (counts.get(o.recipient) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best ?? occurrences[occurrences.length - 1]?.recipient ?? "Recurring";
}

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ExistingGroup = { id: string; identity_key: string; typical_amount: number; status: RecurringGroupStatus };

// Finds an existing group for this counterparty whose typical amount is
// still close to the new cluster's, so a confirmed/dismissed decision
// stays attached across reruns even as new data nudges the median
// slightly — matching by amount proximity rather than a positional index,
// which would churn if cluster boundaries shifted. Creates a new group
// (with a fresh, cluster-specific identity_key) when nothing matches.
async function upsertClusterGroup(
  supabase: Supabase,
  userId: string,
  counterpartyKey: string,
  candidates: ExistingGroup[],
  usedGroupIds: Set<string>,
  fields: { label: string; intervalDays: number; typicalAmount: number },
  createStatus: "detected" | "confirmed",
): Promise<{ id: string; status: RecurringGroupStatus } | null> {
  const match = candidates.find(
    (g) =>
      !usedGroupIds.has(g.id) &&
      (g.typical_amount === 0
        ? fields.typicalAmount === 0
        : Math.abs(fields.typicalAmount - g.typical_amount) / Math.abs(g.typical_amount) <= AMOUNT_CLUSTER_TOLERANCE),
  );

  if (match) {
    usedGroupIds.add(match.id);
    await supabase
      .from("recurring_groups")
      .update({
        label: fields.label,
        interval_days: fields.intervalDays,
        typical_amount: fields.typicalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id);
    return { id: match.id, status: match.status };
  }

  const newKey = `${counterpartyKey}:${crypto.randomUUID().slice(0, 8)}`;
  const { data: created } = await supabase
    .from("recurring_groups")
    .insert({
      user_id: userId,
      identity_key: newKey,
      label: fields.label,
      interval_days: fields.intervalDays,
      typical_amount: fields.typicalAmount,
      status: createStatus,
    })
    .select("id, status")
    .single();

  if (!created) return null;
  usedGroupIds.add(created.id);
  return { id: created.id, status: created.status };
}

// Additive only: extends/updates groups it finds, never demotes a group's
// status (a dismissed or confirmed decision sticks). New groups start
// 'detected' — a suggestion, not a write to is_recurring. Only when a
// group is already 'confirmed' does newly-linked history inherit
// is_recurring=true automatically (extending a pattern the user already
// signed off on needs no fresh confirmation).
export async function recomputeRecurringGroups(userId: string): Promise<void> {
  const supabase = await createClient();

  const [{ data: transactions }, { data: existingGroups }] = await Promise.all([
    supabase.from("transactions").select("id, occurred_at, amount, recipient, counterparty_iban").eq("user_id", userId),
    supabase.from("recurring_groups").select("id, identity_key, typical_amount, status").eq("user_id", userId),
  ]);

  if (!transactions || transactions.length === 0) return;

  const byCounterparty = new Map<string, Occurrence[]>();
  for (const tx of transactions) {
    const key = identityKey({ recipient: tx.recipient, counterpartyIban: tx.counterparty_iban });
    if (!key) continue;
    const list = byCounterparty.get(key) ?? [];
    list.push({ id: tx.id, occurredAt: tx.occurred_at, amount: tx.amount, recipient: tx.recipient });
    byCounterparty.set(key, list);
  }

  for (const [counterpartyKey, occurrences] of byCounterparty) {
    const candidates = (existingGroups ?? []).filter(
      (g) => g.identity_key === counterpartyKey || g.identity_key.startsWith(`${counterpartyKey}:`),
    );
    const usedGroupIds = new Set<string>();

    for (const cluster of clusterByAmount(occurrences)) {
      const sorted = [...cluster].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      const interval = detectInterval(sorted);
      if (!interval) continue;

      const group = await upsertClusterGroup(
        supabase,
        userId,
        counterpartyKey,
        candidates,
        usedGroupIds,
        { label: mostCommonLabel(sorted), intervalDays: interval, typicalAmount: typicalAmount(sorted) },
        "detected",
      );
      if (!group) continue;

      const ids = sorted.map((o) => o.id);
      await supabase.from("transactions").update({ recurring_group_id: group.id }).in("id", ids);
      if (group.status === "confirmed") {
        await supabase.from("transactions").update({ is_recurring: true }).in("id", ids);
      }
    }
  }
}

export async function confirmRecurringGroup(userId: string, groupId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error: groupError } = await supabase
    .from("recurring_groups")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", groupId)
    .eq("user_id", userId);
  if (groupError) return { success: false };

  const { error: txError } = await supabase
    .from("transactions")
    .update({ is_recurring: true })
    .eq("recurring_group_id", groupId)
    .eq("user_id", userId);

  return { success: !txError };
}

// Un-flags every transaction currently linked to the group and marks it
// dismissed so it never resurfaces as a suggestion — same "don't ask
// again" pattern used elsewhere (the book-split nudge, duplicate banner).
export async function dismissRecurringGroup(userId: string, groupId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { error: groupError } = await supabase
    .from("recurring_groups")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .eq("id", groupId)
    .eq("user_id", userId);
  if (groupError) return { success: false };

  const { error: txError } = await supabase
    .from("transactions")
    .update({ is_recurring: false })
    .eq("recurring_group_id", groupId)
    .eq("user_id", userId);

  return { success: !txError };
}

// Entry point for the manual per-row toggle in the transactions table.
// Flagging a transaction recurring by hand is its own confirmation, so it
// creates (or reuses/confirms) a group immediately — no detection step
// needed. Un-flagging just detaches this one transaction; other
// transactions in the same group are untouched.
export async function setTransactionRecurring(
  userId: string,
  transactionId: string,
  isRecurring: boolean,
): Promise<{ success: boolean }> {
  const supabase = await createClient();

  if (!isRecurring) {
    const { error } = await supabase
      .from("transactions")
      .update({ is_recurring: false, recurring_group_id: null })
      .eq("id", transactionId)
      .eq("user_id", userId);
    return { success: !error };
  }

  const { data: tx } = await supabase
    .from("transactions")
    .select("id, occurred_at, amount, recipient, counterparty_iban, recurring_group_id")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();
  if (!tx) return { success: false };

  if (tx.recurring_group_id) {
    // Already linked to a group (e.g. a 'detected' suggestion) — flagging
    // this row by hand confirms that group outright.
    return confirmRecurringGroup(userId, tx.recurring_group_id);
  }

  const key = identityKey({ recipient: tx.recipient, counterpartyIban: tx.counterparty_iban });
  if (!key) {
    const { error } = await supabase
      .from("transactions")
      .update({ is_recurring: true })
      .eq("id", transactionId)
      .eq("user_id", userId);
    return { success: !error };
  }

  // Fetch-all-and-filter-in-JS (same approach as recomputeRecurringGroups)
  // rather than a `.or()` filter string — recipient text can contain
  // characters (commas, parens) that break PostgREST's filter syntax.
  const [{ data: allTransactions }, { data: existingGroups }] = await Promise.all([
    supabase.from("transactions").select("id, occurred_at, amount, recipient, counterparty_iban").eq("user_id", userId),
    supabase.from("recurring_groups").select("id, identity_key, typical_amount, status").eq("user_id", userId),
  ]);

  const sameCounterparty: Occurrence[] = (allTransactions ?? [])
    .filter((s) => identityKey({ recipient: s.recipient, counterpartyIban: s.counterparty_iban }) === key)
    .map((s) => ({ id: s.id, occurredAt: s.occurred_at, amount: s.amount, recipient: s.recipient }));
  if (sameCounterparty.every((o) => o.id !== tx.id)) {
    sameCounterparty.push({ id: tx.id, occurredAt: tx.occurred_at, amount: tx.amount, recipient: tx.recipient });
  }

  // Only the amount cluster this specific transaction belongs to — not
  // every same-counterparty transaction regardless of amount, which would
  // wrongly pull unrelated charges (e.g. a different tax entirely) into
  // the same manually-confirmed group.
  const myCluster =
    clusterByAmount(sameCounterparty).find((cluster) => cluster.some((o) => o.id === tx.id)) ??
    sameCounterparty.filter((o) => o.id === tx.id);

  const candidates = (existingGroups ?? []).filter(
    (g) => g.identity_key === key || g.identity_key.startsWith(`${key}:`),
  );

  const group = await upsertClusterGroup(
    supabase,
    userId,
    key,
    candidates,
    new Set(),
    { label: mostCommonLabel(myCluster), intervalDays: estimateInterval(myCluster), typicalAmount: typicalAmount(myCluster) },
    "confirmed",
  );
  if (!group) return { success: false };

  if (group.status !== "confirmed") {
    await supabase
      .from("recurring_groups")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", group.id);
  }

  const { error } = await supabase
    .from("transactions")
    .update({ recurring_group_id: group.id, is_recurring: true })
    .eq("id", transactionId)
    .eq("user_id", userId);

  return { success: !error };
}
