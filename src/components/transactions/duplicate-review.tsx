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

function formatImportedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
  // Newest copy of each group pre-selected for deletion; the original
  // (earliest) stays kept — the user can override any of it.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const g of groups) {
      const newest = [...g.transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (newest) set.add(newest.id);
    }
    return set;
  });

  const totalSelected = selectedIds.size;
  const totalDuplicates = useMemo(
    () => groups.reduce((sum, g) => sum + g.transactions.length, 0),
    [groups],
  );

  function toggle(id: string) {
    setSelectedIds((prev) => {
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

      <div className="flex max-h-[560px] flex-col divide-y divide-border overflow-y-auto themed-scrollbar">
        {groups.map((g) => (
          <div key={g.key} className="px-4 py-3">
            <p className="text-[11px] text-muted-2">
              Matched on {g.matchedOn === "date-time" ? "date, time, amount, and recipient" : "date, amount, recipient, and description"}
            </p>

            <div className="mt-2 flex flex-col gap-2">
              {[...g.transactions]
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                .map((tx, i) => (
                  <label
                    key={tx.id}
                    className="flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-canvas"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tx.id)}
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
                      {/* Least useful field for judging a real duplicate — demoted to quiet subtext. */}
                      <p className="mt-0.5 text-[10.5px] text-muted-2">imported {formatImportedAt(tx.createdAt)}</p>
                    </div>
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button variant="secondary" type="button" className="h-8 px-3 text-[13px]" onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button
          type="button"
          className="h-8 px-3 text-[13px]"
          disabled={totalSelected === 0 || deleting}
          onClick={() => onConfirmDelete(Array.from(selectedIds))}
        >
          {deleting ? "Deleting…" : `Delete ${totalSelected} selected`}
        </Button>
      </div>
    </div>
  );
}
