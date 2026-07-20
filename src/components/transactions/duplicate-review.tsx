"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DuplicateGroup } from "@/app/(app)/transactions/actions";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

      <div className="flex max-h-[480px] flex-col divide-y divide-border overflow-y-auto themed-scrollbar">
        {groups.map((g) => (
          <div key={g.key} className="px-4 py-3">
            <p className="text-[13px] font-medium text-foreground">
              {g.recipient || "—"} · {g.amount > 0 ? "+" : "-"}€{Math.abs(g.amount).toFixed(2)} · {g.date}
            </p>
            {g.description && <p className="mt-0.5 text-[12px] text-muted">{g.description}</p>}
            <p className="mt-0.5 text-[11px] text-muted-2">Matched on date, amount, recipient, and description.</p>

            <div className="mt-2 flex flex-col gap-1.5">
              {[...g.transactions]
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                .map((tx, i) => (
                  <label
                    key={tx.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1 text-[12.5px] hover:bg-canvas"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tx.id)}
                      onChange={() => toggle(tx.id)}
                      className="h-3.5 w-3.5 rounded border-border accent-[var(--violet-600)]"
                    />
                    <span className="text-foreground">
                      {i === 0 ? "Original" : "Copy"} · imported {formatDateTime(tx.createdAt)}
                    </span>
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
