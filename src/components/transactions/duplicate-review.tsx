"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DuplicateGroup } from "@/app/(app)/transactions/actions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// The transaction's own date/time — the field duplicates are actually
// matched on — not when it was imported into the app, which answers the
// wrong question and is what made it unclear why two rows were flagged.
function formatMatchedDateTime(occurredAt: string, hasPreciseTime: boolean): string {
  const date = new Date(occurredAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  if (!hasPreciseTime) return date;
  const time = new Date(occurredAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

export function DuplicateReview({
  groups,
  deleting,
  onClose,
  onConfirmDelete,
}: {
  groups: DuplicateGroup[];
  deleting: boolean;
  onClose: () => void;
  onConfirmDelete: (ids: string[]) => void;
}) {
  // The checkbox means "keep this one" — the original (earliest copy) of
  // each group is pre-checked, everything else is what gets deleted by
  // default. Checked = survives; unchecked = deleted. This is the
  // opposite of pre-checking what gets destroyed, which reads backwards.
  const [keptIds, setKeptIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const g of groups) {
      const original = [...g.transactions].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      if (original) set.add(original.id);
    }
    return set;
  });

  const totalDuplicates = useMemo(
    () => groups.reduce((sum, g) => sum + g.transactions.length, 0),
    [groups],
  );
  const totalToDelete = totalDuplicates - keptIds.size;

  function toggle(id: string) {
    setKeptIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">Review possible duplicates</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {groups.length} group{groups.length === 1 ? "" : "s"} · {totalDuplicates} transactions total
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-[13px] font-medium text-muted hover:text-foreground">
          Close
        </button>
      </div>

      <div className="flex items-center gap-2.5 border-b border-border bg-canvas px-4 py-1.5 pl-[27px] text-[11px] font-medium tracking-wide text-muted-2 uppercase">
        Keep
      </div>

      <div className="flex max-h-[560px] flex-col divide-y divide-border overflow-y-auto themed-scrollbar">
        {groups.map((g) => (
          <div key={g.key} className="px-4 py-3">
            <p className="text-[11px] text-muted-2">
              Matched on {g.matchedOn === "date-time" ? "date, time, amount, and recipient" : "date, amount, and recipient"}
            </p>

            <div className="mt-2 flex flex-col gap-2">
              {[...g.transactions]
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                .map((tx, i) => (
                  <label
                    key={tx.id}
                    className={`flex items-start gap-2.5 rounded-xl px-2 py-2 transition-opacity hover:bg-canvas ${
                      keptIds.has(tx.id) ? "" : "opacity-40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={keptIds.has(tx.id)}
                      onChange={() => toggle(tx.id)}
                      className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-border accent-[var(--violet-600)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-[12px] font-medium text-muted-2">{i === 0 ? "Original" : "Copy"}</span>
                        <span className="text-[13px] font-medium text-foreground">{tx.recipient || "—"}</span>
                        <span className="text-[13px] font-semibold tabular-nums text-foreground">
                          {tx.amount > 0 ? "+" : "-"}€{Math.abs(tx.amount).toFixed(2)}
                        </span>
                        <span className="text-[12.5px] text-muted">
                          {formatDate(tx.occurredAt)}
                          {tx.hasPreciseTime && ` · ${formatTime(tx.occurredAt)}`}
                        </span>
                      </div>
                      {tx.description && (
                        <p className="mt-0.5 truncate text-[12px] text-muted">{tx.description}</p>
                      )}
                      {tx.rawDescription && tx.rawDescription !== tx.description && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-2">{tx.rawDescription}</p>
                      )}
                      <p className="mt-0.5 text-[10.5px] text-muted-2">
                        {formatMatchedDateTime(tx.occurredAt, tx.hasPreciseTime)}
                      </p>
                    </div>
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button variant="secondary" type="button" size="sm" onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={totalToDelete === 0 || deleting}
          onClick={() =>
            onConfirmDelete(
              groups.flatMap((g) => g.transactions.filter((t) => !keptIds.has(t.id)).map((t) => t.id)),
            )
          }
        >
          {deleting ? "Deleting…" : `Keep selected · Delete ${totalToDelete}`}
        </Button>
      </div>
    </div>
  );
}
