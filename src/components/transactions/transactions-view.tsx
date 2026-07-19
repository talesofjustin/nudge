"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TransactionsToolbar } from "@/components/transactions/transactions-toolbar";
import { ContextStrip } from "@/components/transactions/context-strip";
import { TransactionRow } from "@/components/transactions/transaction-row";
import type { CategoryInfo } from "@/components/transactions/category-badge";
import {
  getFilteredTransactions,
  updateTransaction,
  createCategory,
  deleteTransactions,
  type TransactionRowData,
} from "@/app/(app)/transactions/actions";
import { filtersToSearchParams, type FiltersState } from "@/lib/transaction-filters";

type ColumnAlign = "left" | "right" | "center";

const COLUMNS: { label: string; width: string; align?: ColumnAlign }[] = [
  { label: "", width: "3.2%", align: "center" },
  { label: "Date", width: "7.7%" },
  { label: "Recipient", width: "25%" },
  { label: "Note", width: "17.6%" },
  { label: "Amount", width: "9.7%", align: "right" },
  { label: "Category", width: "12%" },
  { label: "Account", width: "10%" },
  { label: "Space", width: "7%" },
  { label: "Recurring", width: "7.8%", align: "center" },
];

export function TransactionsView({
  accounts,
  spaces,
  categories: initialCategories,
  initialRows,
  initialFilters,
  paydayAnchorDay,
}: {
  accounts: { id: string; name: string }[];
  spaces: { id: string; name: string }[];
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
  const [showOnlyUncategorized, setShowOnlyUncategorized] = useState(false);
  const isFirstRender = useRef(true);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const spacesById = useMemo(() => new Map(spaces.map((s) => [s.id, s.name])), [spaces]);

  const uncategorizedCount = rows.filter((r) => !r.categoryId && !r.isTransfer).length;
  const visibleRows = showOnlyUncategorized
    ? rows.filter((r) => !r.categoryId && !r.isTransfer)
    : rows;

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
        spaceId: filters.spaceId,
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
    updates: { description?: string; categoryId?: string | null; isRecurring?: boolean },
  ) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...toRowPatch(updates) } : r)));
    void updateTransaction(id, updates);
  }

  async function handleCreateCategory(
    name: string,
    color: string,
    icon: string,
  ): Promise<CategoryInfo | null> {
    const created = await createCategory(name, color, icon);
    if (created) {
      setCategories((prev) => [...prev, created]);
    }
    return created;
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

  return (
    <div className="shadow-soft overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border">
        <TransactionsToolbar
          accounts={accounts}
          spaces={spaces}
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
        selectedCount={selectedIds.size}
        confirmingDelete={confirmingDelete}
        deleting={deleting}
        onStartConfirmDelete={() => setConfirmingDelete(true)}
        onCancelDelete={() => setConfirmingDelete(false)}
        onConfirmDelete={handleBulkDelete}
      />

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
            : "No transactions match these filters."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              {COLUMNS.map((col, i) => (
                <col key={i} style={{ width: col.width }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-canvas">
                <th className="sticky top-0 z-10 border-b border-border bg-canvas px-3 py-2.5 text-center align-middle">
                  <input
                    type="checkbox"
                    checked={visibleRows.length > 0 && selectedIds.size === visibleRows.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border accent-[var(--violet-600)]"
                    aria-label="Select all transactions"
                  />
                </th>
                {COLUMNS.slice(1).map((col) => (
                  <th
                    key={col.label}
                    className={`sticky top-0 z-10 truncate border-b border-border bg-canvas px-3 py-2.5 text-[11px] font-medium tracking-wide text-muted uppercase ${
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    }`}
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
                  spaceName={row.spaceId ? (spacesById.get(row.spaceId) ?? null) : null}
                  categories={categories}
                  selected={selectedIds.has(row.id)}
                  onToggleSelect={toggleSelect}
                  onUpdate={handleUpdate}
                  onFilterByRecipient={handleFilterByRecipient}
                  onCreateCategory={handleCreateCategory}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function toRowPatch(updates: {
  description?: string;
  categoryId?: string | null;
  isRecurring?: boolean;
}): Partial<TransactionRowData> {
  const patch: Partial<TransactionRowData> = {};
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.categoryId !== undefined) patch.categoryId = updates.categoryId;
  if (updates.isRecurring !== undefined) patch.isRecurring = updates.isRecurring;
  return patch;
}
