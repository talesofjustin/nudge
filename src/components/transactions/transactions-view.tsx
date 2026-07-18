"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  TransactionsFilters,
  type FiltersState,
} from "@/components/transactions/transactions-filters";
import { FilterSummary } from "@/components/transactions/filter-summary";
import { TransactionRow } from "@/components/transactions/transaction-row";
import type { CategoryInfo } from "@/components/transactions/category-badge";
import { FilterIcon } from "@/components/icons/dashboard-icons";
import { normalizeRecipient } from "@/lib/known-recipients";
import {
  getFilteredTransactions,
  updateTransaction,
  createCategory,
  setRecipientOwnAccount,
  type TransactionRowData,
} from "@/app/(app)/transactions/actions";
import { getPresetRange } from "@/lib/date-presets";

const COLUMNS = [
  "Date",
  "Recipient",
  "Description",
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
}: {
  accounts: { id: string; name: string }[];
  spaces: { id: string; name: string }[];
  categories: CategoryInfo[];
  initialRows: TransactionRowData[];
}) {
  const monthRange = useMemo(() => getPresetRange("month"), []);

  const [filters, setFilters] = useState<FiltersState>({
    spaceId: null,
    accountId: null,
    categoryIds: [],
    amountMin: "",
    amountMax: "",
    dateFrom: monthRange.from,
    dateTo: monthRange.to,
  });
  const [showFilters, setShowFilters] = useState(false);

  const [categories, setCategories] = useState<CategoryInfo[]>(initialCategories);
  const [rows, setRows] = useState<TransactionRowData[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);
  const spacesById = useMemo(() => new Map(spaces.map((s) => [s.id, s.name])), [spaces]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const hasActiveFilters =
    filters.spaceId !== null ||
    filters.accountId !== null ||
    filters.categoryIds.length > 0 ||
    filters.amountMin !== "" ||
    filters.amountMax !== "" ||
    filters.dateFrom !== monthRange.from ||
    filters.dateTo !== monthRange.to;

  const uncategorizedCount = rows.filter((r) => !r.categoryId && !r.isTransfer).length;

  // Debounced refetch whenever any filter changes (skips the first render —
  // the server already fetched the default "this month" view).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);

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
      });

      setLoading(false);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setRows(res.rows);
    }, 400);

    return () => clearTimeout(timeout);
  }, [filters]);

  function handleFilterChange(patch: Partial<FiltersState>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function handleUpdate(
    id: string,
    updates: { description?: string; categoryId?: string | null; isRecurring?: boolean },
  ) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...toRowPatch(updates) } : r)));
    void updateTransaction(id, updates);
  }

  function handleToggleTransfer(recipient: string, isOwnAccount: boolean) {
    const normalized = normalizeRecipient(recipient);
    setRows((prev) =>
      prev.map((r) =>
        r.recipient && normalizeRecipient(r.recipient) === normalized
          ? { ...r, isTransfer: isOwnAccount }
          : r,
      ),
    );
    void setRecipientOwnAccount(recipient, isOwnAccount);
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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors ${
            showFilters
              ? "bg-ink-solid text-white"
              : "border border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          <FilterIcon className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span
              className={`h-1.5 w-1.5 rounded-full ${showFilters ? "bg-white" : "bg-violet-400"}`}
            />
          )}
        </button>
      </div>

      {showFilters && (
        <TransactionsFilters
          accounts={accounts}
          spaces={spaces}
          categories={categories}
          filters={filters}
          onChange={handleFilterChange}
        />
      )}

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

      <Card className="p-0">
        {error && (
          <p className="px-6 py-4 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        {loading && (
          <p className="px-6 py-3 text-[13px] text-muted">Updating…</p>
        )}

        {rows.length === 0 && !loading ? (
          <p className="px-6 py-12 text-center text-[13px] text-muted">
            No transactions match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  {COLUMNS.map((col) => (
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
                    onUpdate={handleUpdate}
                    onToggleTransfer={handleToggleTransfer}
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
