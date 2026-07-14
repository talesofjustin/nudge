"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { mapRows, type ColumnMapping, type ParsedRow } from "@/lib/csv";
import type { ImportRow } from "@/app/(app)/import/actions";

const FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: "date", label: "Date", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "recipient", label: "Recipient", required: false },
  { key: "description", label: "Description", required: false },
];

type Props = {
  headers: string[];
  rows: ParsedRow[];
  mapping: ColumnMapping;
  onChangeMapping: (mapping: ColumnMapping) => void;
  onBack: () => void;
  onConfirm: (validRows: ImportRow[]) => void;
  submitting: boolean;
  submitError: string | null;
};

export function MappingStep({
  headers,
  rows,
  mapping,
  onChangeMapping,
  onBack,
  onConfirm,
  submitting,
  submitError,
}: Props) {
  const mapped = useMemo(() => mapRows(rows, mapping), [rows, mapping]);
  const validRows = mapped.filter((r) => r.valid);
  const skippedCount = mapped.length - validRows.length;
  const canConfirm = mapping.date !== null && mapping.amount !== null && validRows.length > 0;

  return (
    <Card className="flex flex-col gap-6">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Map your columns</h2>
        <p className="mt-1 text-[13px] text-muted">
          We matched what we could — double check before importing.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {FIELDS.map((f) => (
          <Select
            key={f.key}
            label={f.required ? f.label : `${f.label} (optional)`}
            value={mapping[f.key] ?? ""}
            onChange={(e) =>
              onChangeMapping({ ...mapping, [f.key]: e.target.value || null })
            }
          >
            <option value="">{f.required ? "Select column" : "None"}</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border bg-canvas">
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-medium text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {headers.map((h) => (
                  <td key={h} className="whitespace-nowrap px-3 py-2 text-foreground">
                    {row[h]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[13px] text-muted">
        {validRows.length} row{validRows.length === 1 ? "" : "s"} ready to import
        {skippedCount > 0 && (
          <>
            {" "}
            · {skippedCount} row{skippedCount === 1 ? "" : "s"} will be skipped (missing
            or invalid date/amount)
          </>
        )}
      </p>

      {submitError && (
        <p className="text-sm text-danger" role="alert">
          {submitError}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" type="button" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button
          type="button"
          disabled={!canConfirm || submitting}
          onClick={() =>
            onConfirm(
              validRows.map((r) => ({
                date: r.date!,
                amount: r.amount!,
                recipient: r.recipient,
                description: r.description,
              })),
            )
          }
        >
          {submitting
            ? "Importing…"
            : `Import ${validRows.length} transaction${validRows.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </Card>
  );
}
