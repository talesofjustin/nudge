import { Card } from "@/components/ui/card";

export type ImportHistoryEntry = {
  id: string;
  filename: string | null;
  rowCount: number;
  createdAt: string;
  accountName: string;
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
        {imports.map((imp) => (
          <div key={imp.id} className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-[14px] font-medium text-foreground">
                {imp.filename || `Import — ${formatDate(imp.createdAt)}`}
              </p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {imp.accountName} · {formatDate(imp.createdAt)}
              </p>
            </div>
            <span className="text-[13px] text-muted">
              {imp.rowCount} row{imp.rowCount === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
