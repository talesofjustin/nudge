import { Card } from "@/components/ui/card";
import { formatStatementPeriod } from "@/lib/statement-period";

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

export function ImportHistory({ imports }: { imports: ImportHistoryEntry[] }) {
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
                <p className="text-[14px] font-medium text-foreground">
                  {imp.filename || `Import — ${formatDate(imp.createdAt)}`}
                </p>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {imp.accountName}
                  {imp.spaceName && ` · ${imp.spaceName}`}
                  {statementPeriod && ` · ${statementPeriod}`} · imported {formatDate(imp.createdAt)}
                </p>
              </div>
              <span className="whitespace-nowrap text-right text-[13px] text-muted">
                {imp.rowCount} row{imp.rowCount === 1 ? "" : "s"}
                {imp.skippedCount > 0 && (
                  <>
                    <br />
                    <span className="text-[12px] text-muted-2">{imp.skippedCount} skipped</span>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
