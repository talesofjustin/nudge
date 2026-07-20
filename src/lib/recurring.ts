import { createClient } from "@/lib/supabase/server";
import { identityKey } from "@/lib/counterparty-identity";

// A recurring pattern is about rhythm, not amount — a salary with holiday
// pay must not look "broken". Grouping matches on counterparty identity
// (IBAN first, recipient name otherwise) plus a regular interval; the
// typical amount is the median of non-outlier occurrences, recomputed
// from scratch each time rather than incrementally maintained, since
// deletions/edits would otherwise leave it stale.

const MIN_OCCURRENCES = 3;
const MIN_INTERVAL_DAYS = 5;
const MAX_INTERVAL_DAYS = 400;
const INTERVAL_TOLERANCE = 0.3; // gaps within ±30% of the median count as "regular"
const MIN_REGULAR_FRACTION = 0.7; // at least 70% of gaps must fall in that band
const OUTLIER_THRESHOLD = 0.25; // >25% off the typical amount = outlier

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

// Additive only: extends/updates groups it finds, but never un-marks a
// transaction as recurring (e.g. if history shrinks below the detection
// threshold). Best-effort — callers should await it but not fail their
// own operation if something here goes wrong.
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

    const amount = typicalAmount(occurrences);
    const label = mostCommonLabel(occurrences);

    const { data: group } = await supabase
      .from("recurring_groups")
      .upsert(
        { user_id: userId, identity_key: key, label, interval_days: interval, typical_amount: amount, updated_at: new Date().toISOString() },
        { onConflict: "user_id,identity_key" },
      )
      .select("id")
      .single();

    if (!group) continue;

    await supabase
      .from("transactions")
      .update({ recurring_group_id: group.id, is_recurring: true })
      .in(
        "id",
        occurrences.map((o) => o.id),
      );
  }
}
