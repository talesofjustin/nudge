"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TransactionsToolbar } from "@/components/transactions/transactions-toolbar";
import { ContextStrip } from "@/components/transactions/context-strip";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { DuplicateReview } from "@/components/transactions/duplicate-review";
import type { CategoryInfo } from "@/components/transactions/category-badge";
import type { BookInfo } from "@/components/transactions/book-picker";
import { identityKey } from "@/lib/counterparty-identity";
import {
  getFilteredTransactions,
  updateTransaction,
  createCategory,
  updateCategory,
  deleteTransactions,
  markTransactionsReviewed,
  getRecipientBookRules,
  setRecipientBookRule,
  getRecipientCategoryRules,
  setRecipientCategoryRule,
  getDuplicateGroups,
  type TransactionRowData,
  type DuplicateGroup,
} from "@/app/(app)/transactions/actions";
import { filtersToSearchParams, type FiltersState } from "@/lib/transaction-filters";
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

export function TransactionsView({
  accounts,
  books,
  categories: initialCategories,
  initialRows,
  initialFilters,
  paydayAnchorDay,
}: {
  accounts: { id: string; name: string }[];
  books: BookInfo[];
  categories: CategoryInfo[];
  initialRows: TransactionRowData[];
  initialFilters: FiltersState;
  paydayAnchorDay: number | null;
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
  const [bookRules, setBookRules] = useState<Map<string, string>>(new Map());
  const [categoryRules, setCategoryRules] = useState<Map<string, string>>(new Map());
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[] | null>(null);
  const [duplicateBannerDismissed, setDuplicateBannerDismissed] = useState(false);
  const [reviewingDuplicates, setReviewingDuplicates] = useState(false);
  const [deletingDuplicates, setDeletingDuplicates] = useState(false);
  const isFirstRender = useRef(true);

  const showBookFeature = books.length > 1;

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);

  useEffect(() => {
    (async () => {
      const [bookRuleList, categoryRuleList, duplicates] = await Promise.all([
        getRecipientBookRules(),
        getRecipientCategoryRules(),
        getDuplicateGroups(),
      ]);
      setBookRules(
        new Map(
          bookRuleList
            .map((r) => [identityKey({ recipient: r.recipient, counterpartyIban: r.counterpartyIban }), r.bookId] as const)
            .filter((entry): entry is [string, string] => entry[0] !== null),
        ),
      );
      setCategoryRules(
        new Map(
          categoryRuleList
            .map((r) => [identityKey({ recipient: r.recipient, counterpartyIban: r.counterpartyIban }), r.categoryId] as const)
            .filter((entry): entry is [string, string] => entry[0] !== null),
        ),
      );
      setDuplicateGroups(duplicates);
    })();
  }, []);

  const uncategorizedCount = rows.filter((r) => !r.categoryId && !r.isTransfer).length;
  const unassignedBookCount = showBookFeature ? rows.filter((r) => !r.bookId).length : 0;
  const unreviewedCount = rows.filter((r) => r.categorySource === "auto" && !r.reviewedAt).length;

  const visibleRows = rows.filter((r) => {
    if (showOnlyUncategorized && (r.categoryId || r.isTransfer)) return false;
    if (showOnlyUnassignedBook && r.bookId) return false;
    if (showOnlyUnreviewed && !(r.categorySource === "auto" && !r.reviewedAt)) return false;
    return true;
  });

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

      const min = filters.amountMin.trim() ? Number(filters.amountMin) : null;
      const max = filters.amountMax.trim() ? Number(filters.amountMax) : null;

      const res = await getFilteredTransactions({
        bookId: filters.bookId,
        accountId: filters.accountId,
        categoryIds: filters.categoryIds,
        amountMin: min !== null && !Number.isNaN(min) ? min : null,
        amountMax: max !== null && !Number.isNaN(max) ? max : null,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        recipient: filters.recipient,
      });

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

  function handleUpdate(
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
    void updateTransaction(id, updates);
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
    const key = identityKey({ recipient, counterpartyIban: row?.counterpartyIban });
    if (key) setBookRules((prev) => new Map(prev).set(key, bookId));
    await setRecipientBookRule(recipient, bookId, row?.counterpartyIban ?? null);
  }

  async function handleOfferCategoryRule(recipient: string, categoryId: string) {
    const row = rows.find((r) => r.recipient === recipient);
    const key = identityKey({ recipient, counterpartyIban: row?.counterpartyIban });
    if (key) setCategoryRules((prev) => new Map(prev).set(key, categoryId));
    await setRecipientCategoryRule(recipient, categoryId, row?.counterpartyIban ?? null);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === visibleRows.length ? new Set() : new Set(visibleRows.map((r) => r.id)),
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
                    <th className="sticky top-0 z-10 border-b border-border bg-canvas px-3 py-2 text-center align-middle">
                      <input
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
                        className={`sticky top-0 z-10 truncate border-b border-border bg-canvas px-3 py-2 text-[11px] font-medium tracking-wide text-muted uppercase ${
                          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const key = identityKey({ recipient: row.recipient, counterpartyIban: row.counterpartyIban });
                    return (
                      <TransactionRow
                        key={row.id}
                        row={row}
                        accountName={accountsById.get(row.accountId) ?? "Unknown account"}
                        books={books}
                        categories={categories}
                        showBookColumn={showBookFeature}
                        selected={selectedIds.has(row.id)}
                        bookRuleTargetId={key ? (bookRules.get(key) ?? null) : null}
                        categoryRuleTargetId={key ? (categoryRules.get(key) ?? null) : null}
                        onToggleSelect={toggleSelect}
                        onUpdate={handleUpdate}
                        onDelete={handleDeleteRow}
                        onFilterByRecipient={handleFilterByRecipient}
                        onCreateCategory={handleCreateCategory}
                        onUpdateCategory={handleUpdateCategory}
                        onOfferBookRule={handleOfferBookRule}
                        onOfferCategoryRule={handleOfferCategoryRule}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
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
