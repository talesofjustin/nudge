"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import { FilterChip } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import {
  distinctValues,
  guessDecimalSeparator,
  guessExpenseValue,
  mapRows,
  type ColumnMapping,
  type ParsedRow,
} from "@/lib/csv";
import type { ImportRow } from "@/app/(app)/import/actions";
import type { DecimalSeparator } from "@/lib/supabase/database.types";

const UNSET = "__unset__";

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
  timezone: string;
  defaultDecimalSeparator: DecimalSeparator | null;
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
  timezone,
  defaultDecimalSeparator,
  onBack,
  onConfirm,
  submitting,
  submitError,
}: Props) {
  const [decimalSeparator, setDecimalSeparator] = useState<DecimalSeparator>(() => {
    const samples = mapping.amount ? rows.slice(0, 20).map((r) => r[mapping.amount!]) : [];
    return guessDecimalSeparator(samples) ?? defaultDecimalSeparator ?? "period";
  });

  const [expenseValue, setExpenseValue] = useState<string | null>(() =>
    mapping.sign ? guessExpenseValue(distinctValues(rows, mapping.sign)) : null,
  );

  // Re-guess whenever the user picks a *different* sign column — the
  // previous expense value wouldn't apply to a new column's values anyway.
  // Adjusted during render (React's recommended pattern for state that
  // depends on a prop change) rather than in an effect, which would cause
  // an extra render pass.
  const [prevSignColumn, setPrevSignColumn] = useState(mapping.sign);
  if (mapping.sign !== prevSignColumn) {
    setPrevSignColumn(mapping.sign);
    setExpenseValue(mapping.sign ? guessExpenseValue(distinctValues(rows, mapping.sign)) : null);
  }

  const signValues = mapping.sign ? distinctValues(rows, mapping.sign) : [];

  const mapped = useMemo(
    () => mapRows(rows, mapping, { decimalSeparator, timezone, expenseValue }),
    [rows, mapping, decimalSeparator, timezone, expenseValue],
  );
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
            value={mapping[f.key] ?? UNSET}
            onValueChange={(value) =>
              onChangeMapping({ ...mapping, [f.key]: value === UNSET ? null : value })
            }
          >
            <SelectItem value={UNSET}>{f.required ? "Select column" : "None"}</SelectItem>
            {headers.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </Select>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-canvas p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-muted">Amount format</span>
          <div className="flex gap-2">
            <FilterChip
              active={decimalSeparator === "period"}
              onClick={() => setDecimalSeparator("period")}
            >
              1,234.56
            </FilterChip>
            <FilterChip
              active={decimalSeparator === "comma"}
              onClick={() => setDecimalSeparator("comma")}
            >
              1.234,56
            </FilterChip>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:max-w-xs">
          <Select
            label="Debit/credit column (optional)"
            value={mapping.sign ?? UNSET}
            onValueChange={(value) =>
              onChangeMapping({ ...mapping, sign: value === UNSET ? null : value })
            }
          >
            <SelectItem value={UNSET}>None — use amount&apos;s own sign</SelectItem>
            {headers.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </Select>

          {mapping.sign && (
            <Select
              label="Which value means money out?"
              value={expenseValue ?? UNSET}
              onValueChange={(value) => setExpenseValue(value === UNSET ? null : value)}
            >
              <SelectItem value={UNSET}>Select value</SelectItem>
              {signValues.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </Select>
          )}
        </div>
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
