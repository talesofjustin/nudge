"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
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
  bookName: string | null;
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

export function ImportHistory({
  imports: initialImports,
  showBookFeature,
}: {
  imports: ImportHistoryEntry[];
  showBookFeature: boolean;
}) {
  const [imports, setImports] = useState(initialImports);

  async function handleDelete(id: string) {
    const res = await deleteImportHistoryEntry(id);
    if (res.success) {
      setImports((prev) => prev.filter((i) => i.id !== id));
    }
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
          return (
            <div key={imp.id} className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <p className="text-[14.5px] font-semibold text-foreground">
                  {statementPeriod ?? `Import — ${formatDate(imp.createdAt)}`}
                </p>
                <p className="mt-0.5 text-[13px] text-muted">
                  {imp.accountName}
                  {showBookFeature && imp.bookName && ` · ${imp.bookName}`}
                </p>
                <p className="mt-1 text-[11.5px] text-muted-2">
                  {imp.rowCount} row{imp.rowCount === 1 ? "" : "s"}
                  {imp.skippedCount > 0 &&
                    ` (${imp.skippedCount} skipped)`} · imported {formatDate(imp.createdAt)}
                  {imp.filename && ` · ${imp.filename}`}
                </p>
              </div>

              <ConfirmDeleteButton
                icon={<TrashIcon className="h-3.5 w-3.5" />}
                label="Remove this history entry"
                confirmMessage="Remove this entry?"
                onConfirm={() => handleDelete(imp.id)}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
