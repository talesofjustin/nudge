"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProcessingIndicator } from "@/components/import/processing-indicator";
import {
  runImportChecks,
  previewImportRows,
  type ImportRow,
  type RowPreview,
} from "@/app/(app)/import/actions";
import { resolveTransferFlag, setRecipientBookRule, setRecipientCategoryRule } from "@/app/(app)/transactions/actions";
import { identityKey } from "@/lib/counterparty-identity";
import type { BookInfo } from "@/components/transactions/book-picker";
import type { ImportFlag } from "@/lib/import-checks";
import type { ColumnMapping } from "@/lib/csv";

type ItemState = { id: string; label: string; data?: Record<string, string>; resolved: boolean };
type FlagState = Omit<ImportFlag, "items"> & { resolved: boolean; items?: ItemState[] };
type RowState = ImportRow & RowPreview & { selected: boolean };
type RowFilter = "all" | "new" | "duplicate";

function isFlagResolved(flag: FlagState): boolean {
  if (flag.items) return flag.items.every((i) => i.resolved);
  return flag.resolved;
}

function isFlagBlocking(flag: FlagState): boolean {
  return flag.blocking !== false;
}

const MAPPING_SUMMARY_FIELDS: { key: keyof ColumnMapping; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "amount", label: "Amount" },
  { key: "recipient", label: "Recipient" },
  { key: "description", label: "Note" },
  { key: "counterpartyIban", label: "Counterparty account" },
];

// Lets the user verify what's about to be imported right before
// committing, without leaving this step — only the fields actually
// mapped show up.
function MappingSummary({ mapping, onEdit }: { mapping: ColumnMapping | null; onEdit: () => void }) {
  const parts = MAPPING_SUMMARY_FIELDS.filter((f) => mapping?.[f.key]).map(
    (f) => `${f.label} ← ${mapping![f.key]}`,
  );

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl bg-canvas px-3 py-2 text-[12.5px] text-muted">
      {parts.length > 0 ? (
        parts.map((part, i) => (
          <span key={part}>
            {part}
            {i < parts.length - 1 && <span className="ml-1.5 text-muted-2">·</span>}
          </span>
        ))
      ) : (
        <span>Using this account&apos;s saved column mapping.</span>
      )}
      <button type="button" onClick={onEdit} className="ml-auto font-medium text-violet-600 hover:underline">
        Edit mapping
      </button>
    </div>
  );
}

export function ReviewStep({
  rows,
  accountId,
  books,
  mapping,
  onEditMapping,
  onBack,
  onConfirm,
}: {
  rows: ImportRow[];
  accountId: string;
  books: BookInfo[];
  mapping: ColumnMapping | null;
  onEditMapping: () => void;
  onBack: () => void;
  onConfirm: (selectedRows: ImportRow[], bookOverrides: Record<string, string>) => void;
}) {
  const [status, setStatus] = useState<"checking" | "ready">("checking");
  const [flags, setFlags] = useState<FlagState[]>([]);
  const [rowStates, setRowStates] = useState<RowState[]>([]);
  const [rowFilter, setRowFilter] = useState<RowFilter>("all");
  const [bookOverrides, setBookOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const start = Date.now();
      const [preview, checks] = await Promise.all([
        previewImportRows(accountId, rows),
        runImportChecks(accountId, rows),
      ]);
      const minDelay = Math.max(0, 700 - (Date.now() - start));
      await new Promise((r) => setTimeout(r, minDelay));
      if (cancelled) return;

      setRowStates(
        rows.map((row, i) => ({
          ...row,
          ...preview[i],
          selected: !preview[i].isDuplicate,
        })),
      );
      setFlags(
        checks.flags.map((f) => ({
          ...f,
          resolved: false,
          items: f.items?.map((i) => ({ ...i, resolved: false })),
        })),
      );
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
    // Runs once against the rows/account this step was mounted with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newCount = rowStates.filter((r) => !r.isDuplicate).length;
  const duplicateCount = rowStates.filter((r) => r.isDuplicate).length;
  const selectedCount = rowStates.filter((r) => r.selected).length;

  const visibleRows = useMemo(() => {
    if (rowFilter === "new") return rowStates.filter((r) => !r.isDuplicate);
    if (rowFilter === "duplicate") return rowStates.filter((r) => r.isDuplicate);
    return rowStates;
  }, [rowStates, rowFilter]);

  function toggleRow(index: number) {
    setRowStates((prev) => prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)));
  }

  function setGroupSelected(predicate: (r: RowState) => boolean, selected: boolean) {
    setRowStates((prev) => prev.map((r) => (predicate(r) ? { ...r, selected } : r)));
  }

  async function handleFlagAction(flag: FlagState, actionId: string) {
    if (flag.checkId === "category-suggestion" && actionId === "confirm" && flag.data?.recipient && flag.data?.categoryId) {
      await setRecipientCategoryRule(flag.data.recipient, flag.data.categoryId, flag.data.counterpartyIban || null);
    }
    setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, resolved: true } : f)));
  }

  async function handleTransferItemAction(flag: FlagState, item: ItemState, actionId: string) {
    if (item.data?.recipient) {
      const iban = item.data.counterpartyIban || null;
      if (actionId === "exclude") await resolveTransferFlag(item.data.recipient, true, iban);
      if (actionId === "count") await resolveTransferFlag(item.data.recipient, false, iban);
    }
    setFlags((prev) =>
      prev.map((f) =>
        f.id === flag.id
          ? { ...f, items: f.items?.map((i) => (i.id === item.id ? { ...i, resolved: true } : i)) }
          : f,
      ),
    );
  }

  async function handleBookItemResolve(flag: FlagState, item: ItemState, bookId: string, remember: boolean) {
    const recipient = item.data?.recipient;
    const counterpartyIban = item.data?.counterpartyIban || null;
    if (recipient) {
      const key = identityKey({ recipient, counterpartyIban });
      if (key) setBookOverrides((prev) => ({ ...prev, [key]: bookId }));
      if (remember) await setRecipientBookRule(recipient, bookId, counterpartyIban);
    }
    setFlags((prev) =>
      prev.map((f) =>
        f.id === flag.id
          ? { ...f, items: f.items?.map((i) => (i.id === item.id ? { ...i, resolved: true } : i)) }
          : f,
      ),
    );
  }

  if (status === "checking") {
    return (
      <Card>
        <ProcessingIndicator variant="reviewing" />
      </Card>
    );
  }

  const canContinue = flags.every((f) => !isFlagBlocking(f) || isFlagResolved(f));

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Review before importing</h2>
        <p className="mt-1 text-[13px] text-muted">
          Rows already in Nudge are unchecked — override anything that doesn&apos;t look right.
        </p>
      </div>

      <MappingSummary mapping={mapping} onEdit={onEditMapping} />

      {flags.length > 0 && (
        <div className="flex flex-col gap-3">
          {flags.map((flag) => {
            const resolved = isFlagResolved(flag);
            return (
              <div
                key={flag.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  resolved ? "border-border bg-canvas opacity-60" : "border-violet-400 bg-canvas"
                }`}
              >
                <p className="text-[14px] font-medium text-foreground">{flag.title}</p>
                <p className="mt-1 text-[13px] text-muted">{flag.message}</p>

                {flag.checkId === "book-assignment" && flag.items ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {flag.items.map((item) => (
                      <BookAssignmentRow
                        key={item.id}
                        item={item}
                        books={books}
                        onResolve={(bookId, remember) => handleBookItemResolve(flag, item, bookId, remember)}
                      />
                    ))}
                  </div>
                ) : flag.items ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {flag.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2"
                      >
                        <span className="text-[13px] font-medium text-foreground">{item.label}</span>
                        {item.resolved ? (
                          <span className="text-[12px] font-medium text-mint">Resolved</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              type="button"
                              variant="secondary"
                              className="h-7 px-2.5 text-[12px]"
                              onClick={() => handleTransferItemAction(flag, item, "count")}
                            >
                              Yes, count them normally
                            </Button>
                            <Button
                              type="button"
                              className="h-7 px-2.5 text-[12px]"
                              onClick={() => handleTransferItemAction(flag, item, "exclude")}
                            >
                              No, exclude them
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : flag.resolved ? (
                  <p className="mt-2 text-[12px] font-medium text-mint">Resolved</p>
                ) : (
                  <div className="mt-3 flex gap-2">
                    {(flag.actions ?? []).map((action) => (
                      <Button
                        key={action.id}
                        type="button"
                        variant={action.variant ?? "secondary"}
                        className="h-8 px-3 text-[13px]"
                        onClick={() => handleFlagAction(flag, action.id)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-4 text-[13px]">
        <button
          type="button"
          onClick={() => setRowFilter("all")}
          className={`font-medium ${rowFilter === "all" ? "text-foreground" : "text-muted hover:text-foreground"}`}
        >
          {rowStates.length} total
        </button>
        <button
          type="button"
          onClick={() => setRowFilter("new")}
          className={`font-medium ${rowFilter === "new" ? "text-mint" : "text-muted hover:text-foreground"}`}
        >
          {newCount} new
        </button>
        <button
          type="button"
          onClick={() => setRowFilter("duplicate")}
          className={`font-medium ${rowFilter === "duplicate" ? "text-foreground" : "text-muted hover:text-foreground"}`}
        >
          {duplicateCount} already imported
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="flex items-center gap-4 border-b border-border bg-canvas px-3 py-2 text-[11.5px] text-muted">
          <button type="button" className="font-medium hover:text-foreground" onClick={() => setGroupSelected(() => true, true)}>
            Select all
          </button>
          <button type="button" className="font-medium hover:text-foreground" onClick={() => setGroupSelected(() => true, false)}>
            Select none
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto themed-scrollbar">
          <table className="w-full table-fixed text-left text-[12.5px]">
            <colgroup>
              <col style={{ width: "8%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "36%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "22%" }} />
            </colgroup>
            <thead>
              <tr className="sticky top-0 z-10 border-b border-border bg-canvas">
                <th className="px-3 py-2" />
                <th className="px-2 py-2 text-[11px] font-medium tracking-wide text-muted uppercase">Date</th>
                <th className="px-2 py-2 text-[11px] font-medium tracking-wide text-muted uppercase">Recipient</th>
                <th className="px-2 py-2 text-right text-[11px] font-medium tracking-wide text-muted uppercase">
                  Amount
                </th>
                <th className="px-2 py-2 text-[11px] font-medium tracking-wide text-muted uppercase">Category</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const actualIndex = rowStates.indexOf(row);
                return (
                  <tr key={actualIndex} className={`border-b border-border last:border-0 ${row.isDuplicate ? "opacity-50" : ""}`}>
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={() => toggleRow(actualIndex)}
                        className="h-3.5 w-3.5 rounded border-border accent-[var(--violet-600)]"
                      />
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-muted">{row.date.slice(0, 10)}</td>
                    <td className="truncate px-2 py-1.5 text-foreground">{row.recipient || "—"}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-foreground">
                      {row.amount > 0 ? "+" : "-"}€{Math.abs(row.amount).toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5">
                      {row.isDuplicate ? (
                        <span className="text-muted-2">Already imported</span>
                      ) : row.resolvedCategoryName ? (
                        <span className="inline-flex items-center gap-1 text-violet-600">
                          {row.resolvedCategoryName}
                          <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium">auto</span>
                        </span>
                      ) : (
                        <span className="text-muted-2">New</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" type="button" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          disabled={!canContinue || selectedCount === 0}
          onClick={() =>
            onConfirm(
              rowStates.filter((r) => r.selected).map((r) => ({
                date: r.date,
                amount: r.amount,
                recipient: r.recipient,
                description: r.description,
                counterpartyIban: r.counterpartyIban,
                hasPreciseTime: r.hasPreciseTime,
              })),
              bookOverrides,
            )
          }
        >
          Import {selectedCount} transaction{selectedCount === 1 ? "" : "s"}
        </Button>
      </div>
    </Card>
  );
}

function BookAssignmentRow({
  item,
  books,
  onResolve,
}: {
  item: ItemState;
  books: BookInfo[];
  onResolve: (bookId: string, remember: boolean) => void;
}) {
  const [bookId, setBookId] = useState("");
  const [remember, setRemember] = useState(true);

  if (item.resolved) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-2">
        <span className="text-[13px] font-medium text-foreground">{item.label}</span>
        <span className="text-[12px] font-medium text-mint">Resolved</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{item.label}</span>
      <select
        value={bookId}
        onChange={(e) => setBookId(e.target.value)}
        className="h-7 rounded-lg border border-border bg-canvas px-2 text-[12.5px] text-foreground outline-none focus:border-violet-400"
      >
        <option value="">Choose a book…</option>
        {books.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-[11.5px] text-muted">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-3 w-3 rounded border-border accent-[var(--violet-600)]"
        />
        Remember
      </label>
      <Button
        type="button"
        className="h-7 px-2.5 text-[12px]"
        disabled={!bookId}
        onClick={() => onResolve(bookId, remember)}
      >
        Set
      </Button>
    </div>
  );
}
