"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@/components/icons/dashboard-icons";
import { formatStatementPeriod } from "@/lib/statement-period";
import { deleteImportHistoryEntry } from "@/app/(app)/import/actions";

export type ImportHistoryEntry = {
  id: string;
  filename: string | null;
  rowCount: number;
  skippedCount: number;
  createdAt: string;
  accountName: string;
  spaceName: string | null;
  statementStartDate: string | null;
  statementEndDate: string | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ImportHistory({ imports: initialImports }: { imports: ImportHistoryEntry[] }) {
  const [imports, setImports] = useState(initialImports);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await deleteImportHistoryEntry(id);
    setDeletingId(null);
    if (res.success) {
      setImports((prev) => prev.filter((i) => i.id !== id));
    }
    setConfirmingId(null);
  }

  if (imports.length === 0) return null;

  return (
    <Card>
      <h2 className="text-[15px] font-semibold text-ink">Import history</h2>
      <div className="mt-4 flex flex-col divide-y divide-border">
        {imports.map((imp) => {
          const statementPeriod = formatStatementPeriod(
            imp.statementStartDate,
            imp.statementEndDate,
          );
          const confirming = confirmingId === imp.id;
          return (
            <div key={imp.id} className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <p className="text-[14.5px] font-semibold text-foreground">
                  {statementPeriod ?? `Import — ${formatDate(imp.createdAt)}`}
                </p>
                <p className="mt-0.5 text-[13px] text-muted">
                  {imp.accountName}
                  {imp.spaceName && ` · ${imp.spaceName}`}
                </p>
                <p className="mt-1 text-[11.5px] text-muted-2">
                  {imp.rowCount} row{imp.rowCount === 1 ? "" : "s"}
                  {imp.skippedCount > 0 &&
                    ` (${imp.skippedCount} skipped)`} · imported {formatDate(imp.createdAt)}
                  {imp.filename && ` · ${imp.filename}`}
                </p>
              </div>

              {confirming ? (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[12px] text-muted">Remove this entry?</span>
                  <Button
                    variant="ghost"
                    type="button"
                    className="h-7 px-2 text-[12px]"
                    onClick={() => setConfirmingId(null)}
                    disabled={deletingId === imp.id}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="secondary"
                    type="button"
                    className="h-7 border-danger px-2 text-[12px] text-danger hover:bg-danger/10"
                    onClick={() => handleDelete(imp.id)}
                    disabled={deletingId === imp.id}
                  >
                    {deletingId === imp.id ? "Removing…" : "Confirm"}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingId(imp.id)}
                  title="Remove this history entry"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-2 transition-colors hover:bg-canvas hover:text-danger"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
