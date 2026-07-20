import { createClient } from "@/lib/supabase/server";
import { identityKey } from "@/lib/counterparty-identity";

// A recurring pattern is about rhythm, not amount — a salary with holiday
// pay must not look "broken". Grouping matches on counterparty identity
// (IBAN first, recipient name otherwise) plus a regular interval; the
// typical amount is the median of non-outlier occurrences, recomputed
// from scratch each time rather than incrementally maintained, since
// deletions/edits would otherwise leave it stale.
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
export const OUTLIER_THRESHOLD = 0.25; // >25% off the typical amount = outlier
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

async function findOrCreateGroup(
  supabase: Supabase,
  userId: string,
  key: string,
  fields: { label: string; intervalDays: number; typicalAmount: number },
  createStatus: "detected" | "confirmed",
): Promise<{ id: string; status: "detected" | "confirmed" | "dismissed"; isNew: boolean } | null> {
  const { data: existing } = await supabase
    .from("recurring_groups")
    .select("id, status")
    .eq("user_id", userId)
    .eq("identity_key", key)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("recurring_groups")
      .update({
        label: fields.label,
        interval_days: fields.intervalDays,
        typical_amount: fields.typicalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return { id: existing.id, status: existing.status, isNew: false };
  }

  const { data: created } = await supabase
    .from("recurring_groups")
    .insert({
      user_id: userId,
      identity_key: key,
      label: fields.label,
      interval_days: fields.intervalDays,
      typical_amount: fields.typicalAmount,
      status: createStatus,
    })
    .select("id, status")
    .single();

  return created ? { id: created.id, status: created.status, isNew: true } : null;
}

// Additive only: extends/updates groups it finds, never demotes a group's
// status (a dismissed or confirmed decision sticks). New groups start
// 'detected' — a suggestion, not a write to is_recurring. Only when a
// group is already 'confirmed' does newly-linked history inherit
// is_recurring=true automatically (extending a pattern the user already
// signed off on needs no fresh confirmation).
export async function recomputeRecurringGroups(userId: string): Promise<void> {
  const supabase = await createClient();

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, occurred_at, amount, recipient, counterparty_iban")
    .eq("user_id", userId);

  if (!transactions || transactions.length === 0) return;

  const groups = new Map<string, Occurrence[]>();
  for (const tx of transactions) {
    const key = identityKey({ recipient: tx.recipient, counterpartyIban: tx.counterparty_iban });
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push({ id: tx.id, occurredAt: tx.occurred_at, amount: tx.amount, recipient: tx.recipient });
    groups.set(key, list);
  }

  for (const [key, occurrences] of groups) {
    const interval = detectInterval(occurrences);
    if (!interval) continue;

    const group = await findOrCreateGroup(
      supabase,
      userId,
      key,
      { label: mostCommonLabel(occurrences), intervalDays: interval, typicalAmount: typicalAmount(occurrences) },
      "detected",
    );
    if (!group) continue;

    const ids = occurrences.map((o) => o.id);
    await supabase.from("transactions").update({ recurring_group_id: group.id }).in("id", ids);
    if (group.status === "confirmed") {
      await supabase.from("transactions").update({ is_recurring: true }).in("id", ids);
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
  const { data: allTransactions } = await supabase
    .from("transactions")
    .select("id, occurred_at, amount, recipient, counterparty_iban")
    .eq("user_id", userId);

  const occurrences: Occurrence[] = (allTransactions ?? [])
    .filter((s) => identityKey({ recipient: s.recipient, counterpartyIban: s.counterparty_iban }) === key)
    .map((s) => ({ id: s.id, occurredAt: s.occurred_at, amount: s.amount, recipient: s.recipient }));
  if (occurrences.every((o) => o.id !== tx.id)) {
    occurrences.push({ id: tx.id, occurredAt: tx.occurred_at, amount: tx.amount, recipient: tx.recipient });
  }

  const group = await findOrCreateGroup(
    supabase,
    userId,
    key,
    { label: mostCommonLabel(occurrences), intervalDays: estimateInterval(occurrences), typicalAmount: typicalAmount(occurrences) },
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
