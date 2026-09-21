"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { CheckIcon } from "@/components/icons/dashboard-icons";
import { TransactionsToolbar } from "@/components/transactions/transactions-toolbar";
import { ContextStrip } from "@/components/transactions/context-strip";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { DuplicateReview } from "@/components/transactions/duplicate-review";
import type { CategoryInfo } from "@/components/transactions/category-badge";
import type { BookInfo } from "@/components/transactions/book-picker";
import {
  getFilteredTransactions,
  updateTransaction,
  createCategory,
  updateCategory,
  deleteTransactions,
  markTransactionsReviewed,
  setRecipientBookRule,
  setRecipientCategoryRule,
  resolveTransferFlag,
  unflagKnownRecipient,
  getDuplicateGroups,
  type TransactionRowData,
  type DuplicateGroup,
} from "@/app/(app)/transactions/actions";
import type { TransactionSplitData } from "@/app/(app)/transactions/split-actions";
import { filtersToSearchParams, type FiltersState } from "@/lib/transaction-filters";
import { identityKey } from "@/lib/counterparty-identity";
import type { CategoryKind } from "@/lib/supabase/database.types";

type ColumnAlign = "left" | "right" | "center";

function getColumns(showBookColumn: boolean): { label: string; width: string; align?: ColumnAlign }[] {
  const base: { label: string; width: string; align?: ColumnAlign }[] = [
    { label: "", width: "3%", align: "center" },
    { label: "Date", width: "7%" },
    { label: "Recipient", width: showBookColumn ? "20%" : "24%" },
    { label: "Note", width: showBookColumn ? "15%" : "17%" },
    { label: "Amount", width: "10%", align: "right" },
    { label: "Category", width: "12%" },
  ];
  if (showBookColumn) base.push({ label: "Book", width: "11%" });
  base.push({ label: "Account", width: "10%" }, { label: "Recurring", width: "7%", align: "center" });
  return base;
}

export type ImportReviewContext = {
  accountName: string;
  bookName: string | null;
  statementStartDate: string | null;
  statementEndDate: string | null;
};

function formatReviewPeriod(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function TransactionsView({
  accounts,
  books,
  categories: initialCategories,
  initialRows,
  initialFilters,
  paydayAnchorDay,
  importContext = null,
}: {
  accounts: { id: string; name: string }[];
  books: BookInfo[];
  categories: CategoryInfo[];
  initialRows: TransactionRowData[];
  initialFilters: FiltersState;
  paydayAnchorDay: number | null;
  importContext?: ImportReviewContext | null;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [categories, setCategories] = useState<CategoryInfo[]>(initialCategories);
  const [rows, setRows] = useState<TransactionRowData[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [marking, setMarking] = useState(false);
  const [showOnlyUncategorized, setShowOnlyUncategorized] = useState(false);
  const [showOnlyUnassignedBook, setShowOnlyUnassignedBook] = useState(false);
  const [showOnlyUnreviewed, setShowOnlyUnreviewed] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[] | null>(null);
  const [duplicateBannerDismissed, setDuplicateBannerDismissed] = useState(false);
  const [reviewingDuplicates, setReviewingDuplicates] = useState(false);
  const [deletingDuplicates, setDeletingDuplicates] = useState(false);
  const isFirstRender = useRef(true);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const showBookFeature = books.length > 1;

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);

  useEffect(() => {
    (async () => {
      setDuplicateGroups(await getDuplicateGroups());
    })();
  }, []);

  // A split transaction's own categoryId stops being the source of truth
  // once it has splits (see transactions/split-actions.ts) — counting and
  // filtering both need to look at the split lines instead, and the count
  // reflects individual lines still needing a category, not "1 per
  // transaction", so it's an honest picture of what's left to resolve.
  function isFullyCategorized(r: TransactionRowData): boolean {
    return r.splits.length > 0 ? r.splits.every((s) => s.categoryId !== null) : r.categoryId !== null;
  }
  const uncategorizedCount = rows.reduce((sum, r) => {
    if (r.isTransfer) return sum;
    if (r.splits.length > 0) return sum + r.splits.filter((s) => s.categoryId === null).length;
    return sum + (r.categoryId ? 0 : 1);
  }, 0);
  const unassignedBookCount = showBookFeature ? rows.filter((r) => !r.bookId).length : 0;
  const unreviewedCount = rows.filter((r) => r.categorySource === "auto" && !r.reviewedAt).length;

  function isRowResolved(r: TransactionRowData): boolean {
    return r.isTransfer || isFullyCategorized(r);
  }

  // Reviewing a single import (arrived via the review-queue link, see
  // import/review-queue-actions.ts): `rows` is already scoped to exactly
  // that import's transactions by the importId filter, so its own
  // progress can be read straight off local state — no separate fetch.
  const isReviewingImport = !!filters.importId && !!importContext;
  const importTotal = rows.length;
  const importCategorized = rows.filter(isRowResolved).length;
  const [justCompleted, setJustCompleted] = useState(false);
  const wasAllDoneRef = useRef(false);
  useEffect(() => {
    if (!isReviewingImport) return;
    const allDone = importTotal > 0 && importCategorized === importTotal;
    if (allDone && !wasAllDoneRef.current) setJustCompleted(true);
    wasAllDoneRef.current = allDone;
  }, [isReviewingImport, importTotal, importCategorized]);

  const visibleRows = rows
    .filter((r) => {
      if (showOnlyUncategorized && (r.isTransfer || isFullyCategorized(r))) return false;
      if (showOnlyUnassignedBook && r.bookId) return false;
      if (showOnlyUnreviewed && !(r.categorySource === "auto" && !r.reviewedAt)) return false;
      return true;
    })
    .sort((a, b) => (isReviewingImport ? Number(isRowResolved(a)) - Number(isRowResolved(b)) : 0));

  // The `indeterminate` visual state has no JSX prop — it's DOM-property
  // only, so it has to be imperatively synced onto the checkbox element.
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < visibleRows.length;
    }
  }, [selectedIds, visibleRows.length]);

  function buildFilterParams() {
    const min = filters.amountMin.trim() ? Number(filters.amountMin) : null;
    const max = filters.amountMax.trim() ? Number(filters.amountMax) : null;
    return {
      bookId: filters.bookId,
      accountId: filters.accountId,
      categoryIds: filters.categoryIds,
      amountMin: min !== null && !Number.isNaN(min) ? min : null,
      amountMax: max !== null && !Number.isNaN(max) ? max : null,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      recipient: filters.recipient,
      importId: filters.importId,
    };
  }

  // Debounced refetch + URL sync whenever any filter changes (skips the
  // first render — the server already fetched matching the initial URL).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    router.replace(`${pathname}?${filtersToSearchParams(filters).toString()}`, { scroll: false });

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      setSelectedIds(new Set());

      const res = await getFilteredTransactions(buildFilterParams());

      setLoading(false);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setRows(res.rows);
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function handleFilterChange(patch: Partial<FiltersState>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function handleFilterByRecipient(recipient: string) {
    handleFilterChange({ recipient });
  }

  async function handleUpdate(
    id: string,
    updates: {
      description?: string;
      categoryId?: string | null;
      categorySource?: "manual" | "auto" | null;
      reviewedAt?: string | null;
      isRecurring?: boolean;
      bookId?: string | null;
    },
  ) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...toRowPatch(updates) } : r)));
    await updateTransaction(id, updates);

    // Flagging/unflagging recurring status can create, extend, or reassign
    // a whole recurring_groups cluster server-side — a full refetch is the
    // only way this row (and any siblings in the same amount cluster) picks
    // up the server-computed recurringTypicalAmount/isRecurringOutlier
    // fields without a manual reselect.
    if (updates.isRecurring !== undefined) {
      const res = await getFilteredTransactions(buildFilterParams());
      if (res.success) setRows(res.rows);
    }
  }

  async function handleDeleteRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await deleteTransactions([id]);
  }

  async function handleCreateCategory(
    name: string,
    color: string,
    icon: string,
    kind: CategoryKind,
  ): Promise<CategoryInfo | null> {
    const created = await createCategory(name, color, icon, kind);
    if (created) {
      setCategories((prev) => [...prev, created]);
    }
    return created;
  }

  async function handleUpdateCategory(
    id: string,
    updates: { name: string; color: string; icon: string; kind: CategoryKind },
  ) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    await updateCategory(id, updates);
  }

  async function handleOfferBookRule(recipient: string, bookId: string) {
    const row = rows.find((r) => r.recipient === recipient);
    await setRecipientBookRule(recipient, bookId, row?.counterpartyIban ?? null);
  }

  async function handleOfferCategoryRule(recipient: string, categoryId: string) {
    const row = rows.find((r) => r.recipient === recipient);
    await setRecipientCategoryRule(recipient, categoryId, row?.counterpartyIban ?? null);
  }

  function handleSplitsChanged(id: string, splits: TransactionSplitData[]) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, splits } : r)));
  }

  // Marking/unmarking a transfer is a decision about the counterparty, not
  // this one row — every row sharing its identity (IBAN when known, else
  // recipient name) flips together, matching the rule's own scope once
  // applied server-side to future imports too.
  async function handleToggleTransfer(recipient: string, markAsTransfer: boolean) {
    const source = rows.find((r) => r.recipient === recipient);
    const iban = source?.counterpartyIban ?? null;
    const key = identityKey({ recipient, counterpartyIban: iban });

    setRows((prev) =>
      prev.map((r) =>
        identityKey({ recipient: r.recipient, counterpartyIban: r.counterpartyIban }) === key
          ? { ...r, isTransfer: markAsTransfer }
          : r,
      ),
    );

    if (markAsTransfer) await resolveTransferFlag(recipient, true, iban);
    else await unflagKnownRecipient(recipient, iban);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // A partial selection clears rather than filling in the rest — the
  // indeterminate checkbox reads as "some selected", and clicking it should
  // resolve that ambiguity by starting over, not by silently selecting
  // everything else.
  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === 0 ? new Set(visibleRows.map((r) => r.id)) : new Set(),
    );
  }

  async function handleBulkDelete() {
    setDeleting(true);
    const ids = Array.from(selectedIds);
    const res = await deleteTransactions(ids);
    setDeleting(false);
    setConfirmingDelete(false);
    if (res.success) {
      setRows((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    } else {
      setError(res.error ?? "Could not delete the selected transactions.");
    }
  }

  async function handleBulkMarkReviewed() {
    setMarking(true);
    const ids = Array.from(selectedIds);
    const res = await markTransactionsReviewed(ids);
    setMarking(false);
    if (res.success) {
      const now = new Date().toISOString();
      setRows((prev) => prev.map((r) => (selectedIds.has(r.id) ? { ...r, reviewedAt: now } : r)));
      setSelectedIds(new Set());
    }
  }

  async function handleConfirmDeleteDuplicates(ids: string[]) {
    setDeletingDuplicates(true);
    const res = await deleteTransactions(ids);
    setDeletingDuplicates(false);
    if (res.success) {
      setRows((prev) => prev.filter((r) => !ids.includes(r.id)));
      setDuplicateGroups((prev) =>
        (prev ?? [])
          .map((g) => ({ ...g, transactions: g.transactions.filter((t) => !ids.includes(t.id)) }))
          .filter((g) => g.transactions.length > 1),
      );
      setReviewingDuplicates(false);
    }
  }

  const columns = getColumns(showBookFeature);

  return (
    <div className="flex flex-col gap-3">
      {isReviewingImport && importContext && (
        <div
          className={`shadow-soft flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
            justCompleted ? "border-mint bg-mint/10" : "border-border bg-surface"
          }`}
        >
          {justCompleted ? (
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint text-white">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              <p className="text-[13.5px] font-medium text-foreground">All done — nice work!</p>
            </div>
          ) : (
            <p className="text-[13px] text-muted">
              <span className="font-medium text-foreground">Reviewing:</span> {importContext.accountName}
              {importContext.bookName && ` · ${importContext.bookName}`}
              {formatReviewPeriod(importContext.statementStartDate, importContext.statementEndDate) &&
                ` · ${formatReviewPeriod(importContext.statementStartDate, importContext.statementEndDate)}`}
              {" · "}
              {importCategorized} of {importTotal} categorized
            </p>
          )}
          <Link href="/import" className="shrink-0 text-[13px] font-medium text-violet-600 hover:underline">
            {justCompleted ? "Back to imports" : "Done reviewing"}
          </Link>
        </div>
      )}

      <div className="shadow-soft overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border">
          <TransactionsToolbar
          accounts={accounts}
          books={books}
          categories={categories}
          filters={filters}
          paydayAnchorDay={paydayAnchorDay}
          onChange={handleFilterChange}
        />
      </div>

      <ContextStrip
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        count={visibleRows.length}
        uncategorizedCount={uncategorizedCount}
        showOnlyUncategorized={showOnlyUncategorized}
        onToggleUncategorized={() => setShowOnlyUncategorized((v) => !v)}
        unassignedBookCount={unassignedBookCount}
        showOnlyUnassignedBook={showOnlyUnassignedBook}
        onToggleUnassignedBook={() => setShowOnlyUnassignedBook((v) => !v)}
        showBookFeature={showBookFeature}
        unreviewedCount={unreviewedCount}
        showOnlyUnreviewed={showOnlyUnreviewed}
        onToggleUnreviewed={() => setShowOnlyUnreviewed((v) => !v)}
        duplicateCount={duplicateGroups?.reduce((sum, g) => sum + g.transactions.length, 0) ?? 0}
        duplicateBannerDismissed={duplicateBannerDismissed}
        onReviewDuplicates={() => setReviewingDuplicates(true)}
        onDismissDuplicateBanner={() => setDuplicateBannerDismissed(true)}
        selectedCount={selectedIds.size}
        confirmingDelete={confirmingDelete}
        deleting={deleting}
        marking={marking}
        onStartConfirmDelete={() => setConfirmingDelete(true)}
        onCancelDelete={() => setConfirmingDelete(false)}
        onConfirmDelete={handleBulkDelete}
        onMarkReviewed={handleBulkMarkReviewed}
      />

      {reviewingDuplicates && duplicateGroups ? (
        <DuplicateReview
          groups={duplicateGroups}
          deleting={deletingDuplicates}
          onClose={() => setReviewingDuplicates(false)}
          onConfirmDelete={handleConfirmDeleteDuplicates}
        />
      ) : (
        <>
          {error && (
            <p className="px-4 py-4 text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          {loading && <p className="px-4 py-3 text-[13px] text-muted">Updating…</p>}

          {visibleRows.length === 0 && !loading ? (
            <p className="px-4 py-12 text-center text-[13px] text-muted">
              {showOnlyUncategorized
                ? "No uncategorized transactions in this period."
                : showOnlyUnassignedBook
                  ? "No transactions need a book in this period."
                  : showOnlyUnreviewed
                    ? "No auto-categorised transactions waiting for review."
                    : "No transactions match these filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-left">
                <colgroup>
                  {columns.map((col, i) => (
                    <col key={i} style={{ width: col.width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="bg-canvas">
                    <th
                      className={`sticky z-10 border-b border-border bg-canvas px-3 py-2 text-center align-middle ${
                        selectedIds.size > 0 ? "top-11" : "top-0"
                      }`}
                    >
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={visibleRows.length > 0 && selectedIds.size === visibleRows.length}
                        onChange={toggleSelectAll}
                        className="h-3.5 w-3.5 rounded border-border accent-[var(--violet-600)]"
                        aria-label="Select all transactions"
                      />
                    </th>
                    {columns.slice(1).map((col) => (
                      <th
                        key={col.label}
                        className={`sticky z-10 truncate border-b border-border bg-canvas px-3 py-2 text-[11px] font-medium tracking-wide text-muted uppercase ${
                          selectedIds.size > 0 ? "top-11" : "top-0"
                        } ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <TransactionRow
                      key={row.id}
                      row={row}
                      accountName={accountsById.get(row.accountId) ?? "Unknown account"}
                      books={books}
                      categories={categories}
                      showBookColumn={showBookFeature}
                      selected={selectedIds.has(row.id)}
                      onToggleSelect={toggleSelect}
                      onUpdate={handleUpdate}
                      onDelete={handleDeleteRow}
                      onFilterByRecipient={handleFilterByRecipient}
                      onCreateCategory={handleCreateCategory}
                      onUpdateCategory={handleUpdateCategory}
                      onOfferBookRule={handleOfferBookRule}
                      onOfferCategoryRule={handleOfferCategoryRule}
                      onSplitsChanged={handleSplitsChanged}
                      onToggleTransfer={handleToggleTransfer}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

function toRowPatch(updates: {
  description?: string;
  categoryId?: string | null;
  categorySource?: "manual" | "auto" | null;
  reviewedAt?: string | null;
  isRecurring?: boolean;
  bookId?: string | null;
}): Partial<TransactionRowData> {
  const patch: Partial<TransactionRowData> = {};
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.categoryId !== undefined) patch.categoryId = updates.categoryId;
  if (updates.categorySource !== undefined) patch.categorySource = updates.categorySource;
  if (updates.reviewedAt !== undefined) patch.reviewedAt = updates.reviewedAt;
  if (updates.isRecurring !== undefined) patch.isRecurring = updates.isRecurring;
  if (updates.bookId !== undefined) patch.bookId = updates.bookId;
  return patch;
}
