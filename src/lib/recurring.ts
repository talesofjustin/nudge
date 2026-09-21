import { createClient } from "@/lib/supabase/server";
import { identityKey } from "@/lib/counterparty-identity";
import { extractRecurringReference } from "@/lib/parse-raw-description";
import type { RecurringGroupStatus } from "@/lib/supabase/database.types";

// A recurring pattern is about rhythm, not amount — a salary with holiday
// pay must not look "broken". The unit of recurrence is counterparty AND
// *identity*: a sender like an insurer can bill several genuinely
// different recurring amounts (motor policy, car policy), and those are
// separate recurring items, not one item with the others as "outliers".
//
// Where available, a stable reference extracted from the raw description
// (Polisnummer, Kenmerk, a mandate/contract/invoice number — see
// lib/parse-raw-description.ts) is the real identifier and is preferred:
// occurrences sharing the same repeating reference are one recurring item
// by construction, regardless of amount. Amount-based clustering (within
// AMOUNT_CLUSTER_TOLERANCE of each other) is only a fallback for
// occurrences with no reference, or whose reference doesn't repeat — it
// was previously the only signal, which meant two same-sender charges
// only separated correctly when their amounts happened to differ enough.
// "Outlier" only applies WITHIN an established cluster (e.g. a €1250 rent
// that was €1400 once, or a policy premium that rose at renewal) — a
// genuinely different reference or a well-separated amount forms its own
// cluster/group instead.
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

function amountClose(a: number, b: number): boolean {
  return b === 0 ? a === 0 : Math.abs(a - b) / Math.abs(b) <= AMOUNT_CLUSTER_TOLERANCE;
}

type Occurrence = {
  id: string;
  occurredAt: string;
  amount: number;
  recipient: string | null;
  recurringReference: string | null;
};

// A cluster's `reference` is set only when every occurrence in it shares
// the exact same non-null recurringReference (true by construction for
// clusters built from clusterByReference below) — never inferred from an
// amount-based cluster, even if every occurrence in it happens to carry
// some reference, since those references didn't repeat consistently
// enough on their own to be trusted as the grouping identity.
type Cluster = { occurrences: Occurrence[]; reference: string | null };

// Sequential clustering over amounts sorted ascending: an occurrence joins
// the current cluster if it's within tolerance of that cluster's running
// average, otherwise it starts a new one. Well-separated amounts produce
// well-separated clusters this way — but only a fallback now (see
// clusterByReferenceOrAmount) for occurrences with no reliable reference.
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
    if (amountClose(occ.amount, currentAvg)) {
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

// Groups occurrences that share the same recurringReference (a policy,
// contract, invoice, or mandate number — see lib/parse-raw-description.ts)
// first, since that's a real identifier rather than a coincidence of
// amount. A reference only counts as "repeats consistently" once it's
// shared by 2+ occurrences; a reference that shows up exactly once isn't
// distinguishing anything and falls through to amount clustering like any
// other unreferenced occurrence. This is what correctly separates e.g. two
// insurance policies from the same insurer even when their premiums are
// close enough that amount clustering alone would wrongly merge them.
function clusterByReferenceOrAmount(occurrences: Occurrence[]): Cluster[] {
  const byReference = new Map<string, Occurrence[]>();
  const unreferenced: Occurrence[] = [];

  for (const occ of occurrences) {
    if (occ.recurringReference) {
      const list = byReference.get(occ.recurringReference) ?? [];
      list.push(occ);
      byReference.set(occ.recurringReference, list);
    } else {
      unreferenced.push(occ);
    }
  }

  const clusters: Cluster[] = [];
  for (const [reference, group] of byReference) {
    if (group.length >= 2) {
      clusters.push({ occurrences: group, reference });
    } else {
      unreferenced.push(...group);
    }
  }

  for (const amountCluster of clusterByAmount(unreferenced)) {
    clusters.push({ occurrences: amountCluster, reference: null });
  }

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
type ExistingGroup = {
  id: string;
  identity_key: string;
  typical_amount: number;
  status: RecurringGroupStatus;
  reference: string | null;
};

// Finds an existing group for this counterparty to reuse, so a
// confirmed/dismissed decision stays attached across reruns instead of
// spawning a duplicate. A cluster with a reference matches an existing
// group by that reference first — a real identifier, so it's trusted even
// if the amount has since drifted (e.g. a policy renewal price change).
// Failing that (or for amount-only clusters), falls back to amount
// proximity — but only against candidates that don't already carry a
// *different* reference, since that would mean silently merging into a
// group that's genuinely a different recurring item; that's the exact bug
// this reference-aware matching exists to prevent. A referenced cluster
// CAN claim a not-yet-referenced candidate by amount, which upgrades a
// pre-existing amount-only group to a reference-anchored one going
// forward. Creates a new group (with a fresh, cluster-specific
// identity_key) when nothing matches.
async function upsertClusterGroup(
  supabase: Supabase,
  userId: string,
  counterpartyKey: string,
  candidates: ExistingGroup[],
  usedGroupIds: Set<string>,
  fields: { label: string; intervalDays: number; typicalAmount: number; reference: string | null },
  createStatus: "detected" | "confirmed",
): Promise<{ id: string; status: RecurringGroupStatus } | null> {
  const available = candidates.filter((g) => !usedGroupIds.has(g.id));

  const match =
    (fields.reference && available.find((g) => g.reference === fields.reference)) ||
    available.find((g) => {
      if (g.reference && g.reference !== fields.reference) return false;
      return amountClose(fields.typicalAmount, g.typical_amount);
    });

  if (match) {
    usedGroupIds.add(match.id);
    await supabase
      .from("recurring_groups")
      .update({
        label: fields.label,
        interval_days: fields.intervalDays,
        typical_amount: fields.typicalAmount,
        reference: fields.reference,
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
      reference: fields.reference,
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
    supabase
      .from("transactions")
      .select("id, occurred_at, amount, recipient, counterparty_iban, raw_description, recurring_reference")
      .eq("user_id", userId),
    supabase.from("recurring_groups").select("id, identity_key, typical_amount, status, reference").eq("user_id", userId),
  ]);

  if (!transactions || transactions.length === 0) return;

  // Opportunistic backfill: transactions imported before this column
  // existed (or before a reference key was recognized) only get it once
  // recomputed here — raw_description is already stored, so there's no
  // need to wait for a fresh import. Batched by reference value to match
  // the .in() batching style used elsewhere in this file.
  const referenceUpdates = new Map<string, string[]>();
  for (const tx of transactions) {
    if (tx.recurring_reference !== null || !tx.raw_description) continue;
    const reference = extractRecurringReference(tx.raw_description);
    if (!reference) continue;
    tx.recurring_reference = reference;
    const ids = referenceUpdates.get(reference) ?? [];
    ids.push(tx.id);
    referenceUpdates.set(reference, ids);
  }
  for (const [reference, ids] of referenceUpdates) {
    await supabase.from("transactions").update({ recurring_reference: reference }).in("id", ids);
  }

  const byCounterparty = new Map<string, Occurrence[]>();
  for (const tx of transactions) {
    const key = identityKey({ recipient: tx.recipient, counterpartyIban: tx.counterparty_iban });
    if (!key) continue;
    const list = byCounterparty.get(key) ?? [];
    list.push({
      id: tx.id,
      occurredAt: tx.occurred_at,
      amount: tx.amount,
      recipient: tx.recipient,
      recurringReference: tx.recurring_reference,
    });
    byCounterparty.set(key, list);
  }

  for (const [counterpartyKey, occurrences] of byCounterparty) {
    const candidates = (existingGroups ?? []).filter(
      (g) => g.identity_key === counterpartyKey || g.identity_key.startsWith(`${counterpartyKey}:`),
    );
    const usedGroupIds = new Set<string>();

    for (const { occurrences: cluster, reference } of clusterByReferenceOrAmount(occurrences)) {
      const sorted = [...cluster].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      const interval = detectInterval(sorted);
      if (!interval) continue;

      const group = await upsertClusterGroup(
        supabase,
        userId,
        counterpartyKey,
        candidates,
        usedGroupIds,
        { label: mostCommonLabel(sorted), intervalDays: interval, typicalAmount: typicalAmount(sorted), reference },
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
    .select("id, occurred_at, amount, recipient, counterparty_iban, recurring_group_id, recurring_reference")
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
    supabase
      .from("transactions")
      .select("id, occurred_at, amount, recipient, counterparty_iban, recurring_reference")
      .eq("user_id", userId),
    supabase.from("recurring_groups").select("id, identity_key, typical_amount, status, reference").eq("user_id", userId),
  ]);

  const sameCounterparty: Occurrence[] = (allTransactions ?? [])
    .filter((s) => identityKey({ recipient: s.recipient, counterpartyIban: s.counterparty_iban }) === key)
    .map((s) => ({
      id: s.id,
      occurredAt: s.occurred_at,
      amount: s.amount,
      recipient: s.recipient,
      recurringReference: s.recurring_reference,
    }));
  if (sameCounterparty.every((o) => o.id !== tx.id)) {
    sameCounterparty.push({
      id: tx.id,
      occurredAt: tx.occurred_at,
      amount: tx.amount,
      recipient: tx.recipient,
      recurringReference: tx.recurring_reference,
    });
  }

  // Only the cluster this specific transaction belongs to — not every
  // same-counterparty transaction regardless of reference/amount, which
  // would wrongly pull unrelated charges (e.g. a different policy
  // entirely) into the same manually-confirmed group.
  const myClusterEntry =
    clusterByReferenceOrAmount(sameCounterparty).find((c) => c.occurrences.some((o) => o.id === tx.id)) ?? null;
  const myCluster = myClusterEntry?.occurrences ?? sameCounterparty.filter((o) => o.id === tx.id);
  const myReference = myClusterEntry?.reference ?? null;

  const candidates = (existingGroups ?? []).filter(
    (g) => g.identity_key === key || g.identity_key.startsWith(`${key}:`),
  );

  const group = await upsertClusterGroup(
    supabase,
    userId,
    key,
    candidates,
    new Set(),
    {
      label: mostCommonLabel(myCluster),
      intervalDays: estimateInterval(myCluster),
      typicalAmount: typicalAmount(myCluster),
      reference: myReference,
    },
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
