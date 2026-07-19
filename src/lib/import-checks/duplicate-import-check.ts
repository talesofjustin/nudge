import { createClient } from "@/lib/supabase/server";
import { normalizeRecipient } from "@/lib/known-recipients";
import type { ImportCheckContext, ImportFlag } from "./types";

export const CHECK_ID = "duplicate-import";

function rowKey(date: string, amount: number, recipient: string | null): string {
  return `${date.slice(0, 10)}|${amount}|${recipient ? normalizeRecipient(recipient) : ""}`;
}

// Flags when a meaningful chunk of the rows being imported already exist for
// this account — a strong sign the same statement (or an overlapping one)
// was imported before. Requires both an absolute (>=3) and relative (>=40%)
// overlap so one coincidental match doesn't trigger a false alarm.
export async function run(ctx: ImportCheckContext): Promise<ImportFlag[]> {
  if (!ctx.accountId || ctx.rows.length === 0) return [];

  const supabase = await createClient();
  const dates = ctx.rows.map((r) => r.date.slice(0, 10)).sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  const { data: existing } = await supabase
    .from("transactions")
    .select("occurred_at, amount, recipient")
    .eq("account_id", ctx.accountId)
    .eq("user_id", ctx.userId)
    .gte("occurred_at", minDate)
    .lte("occurred_at", `${maxDate}T23:59:59`);

  if (!existing || existing.length === 0) return [];

  const existingKeys = new Set(
    existing.map((t) => rowKey(t.occurred_at, t.amount, t.recipient)),
  );

  let matchCount = 0;
  const evidence: string[] = [];
  for (const row of ctx.rows) {
    if (existingKeys.has(rowKey(row.date, row.amount, row.recipient))) {
      matchCount++;
      if (evidence.length < 5) {
        const dateLabel = new Date(`${row.date.slice(0, 10)}T00:00:00Z`).toLocaleDateString(
          undefined,
          { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" },
        );
        const amountLabel = `${row.amount > 0 ? "+" : "-"}€${Math.abs(row.amount).toFixed(2)}`;
        evidence.push(`${dateLabel} · ${row.recipient ?? "—"} · ${amountLabel}`);
      }
    }
  }

  const overlapRatio = matchCount / ctx.rows.length;
  if (matchCount < 3 || overlapRatio < 0.4) return [];

  const { data: recentImport } = await supabase
    .from("imports")
    .select("created_at")
    .eq("account_id", ctx.accountId)
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const importedOn = recentImport?.created_at
    ? new Date(recentImport.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "a previous import";

  return [
    {
      id: "duplicate-import",
      checkId: CHECK_ID,
      title: "This looks like a repeat import",
      message: `This looks similar to an import you already did on ${importedOn} (${matchCount} matching transaction${matchCount === 1 ? "" : "s"} found) — import anyway?`,
      evidence,
      actions: [
        { id: "cancel", label: "Cancel", variant: "secondary" },
        { id: "confirm", label: "Import anyway", variant: "primary" },
      ],
    },
  ];
}
