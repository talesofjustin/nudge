"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransactionsFilters } from "@/components/transactions/transactions-filters";
import { FilterSummary } from "@/components/transactions/filter-summary";
import { PeriodBanner } from "@/components/transactions/period-banner";
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

const COLUMNS = [
  "",
  "Date",
  "Recipient",
  "Note",
  "Amount",
  "Category",
  "Account",
  "Space",
  "Recurring",
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
  const isFirstRender = useRef(true);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const spacesById = useMemo(() => new Map(spaces.map((s) => [s.id, s.name])), [spaces]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const uncategorizedCount = rows.filter((r) => !r.categoryId && !r.isTransfer).length;

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
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
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
    <div className="flex flex-col gap-5">
      <PeriodBanner period={filters.period} dateFrom={filters.dateFrom} dateTo={filters.dateTo} />

      <TransactionsFilters
        accounts={accounts}
        spaces={spaces}
        categories={categories}
        filters={filters}
        paydayAnchorDay={paydayAnchorDay}
        onChange={handleFilterChange}
      />

      <FilterSummary rows={rows} categoriesById={categoriesById} />

      {uncategorizedCount > 0 && (
        <Card tone="amber" className="flex items-center justify-between py-4">
          <p className="text-[13px] font-medium text-foreground">
            {uncategorizedCount} transaction{uncategorizedCount === 1 ? "" : "s"} uncategorized
          </p>
          <span className="text-[12px] text-muted">
            Click a category badge below to label them.
          </span>
        </Card>
      )}

      {selectedIds.size > 0 && (
        <Card className="flex items-center justify-between py-3">
          <p className="text-[13px] font-medium text-foreground">
            {selectedIds.size} transaction{selectedIds.size === 1 ? "" : "s"} selected
          </p>
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-muted">Delete these permanently?</span>
              <Button
                variant="secondary"
                className="h-8 px-3 text-[13px]"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                className="h-8 border-danger px-3 text-[13px] text-danger hover:bg-danger/10"
                onClick={handleBulkDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Confirm delete"}
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              className="h-8 px-3 text-[13px]"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete selected
            </Button>
          )}
        </Card>
      )}

      <Card className="p-0">
        {error && (
          <p className="px-6 py-4 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        {loading && <p className="px-6 py-3 text-[13px] text-muted">Updating…</p>}

        {rows.length === 0 && !loading ? (
          <p className="px-6 py-12 text-center text-[13px] text-muted">
            No transactions match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selectedIds.size === rows.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border accent-[var(--violet-600)]"
                      aria-label="Select all transactions"
                    />
                  </th>
                  {COLUMNS.slice(1).map((col) => (
                    <th
                      key={col}
                      className="whitespace-nowrap px-3 py-3 text-[12px] font-medium text-muted"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
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
      </Card>
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
