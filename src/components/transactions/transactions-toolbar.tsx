"use client";

import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { CategoryBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import { CheckIcon } from "@/components/icons/dashboard-icons";
import { getPresetRange, type DatePreset } from "@/lib/date-presets";
import { sanitizeAmountInput } from "@/lib/sanitize-amount";
import type { FiltersState } from "@/lib/transaction-filters";

const ALL = "__all__";

const PERIOD_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

// The period selector's own pill styling (active = solid ink, inactive =
// plain text) — the single heaviest control in the toolbar.
const periodButtonClass = (active: boolean) =>
  `inline-flex h-7 items-center rounded-full px-2.5 text-[12.5px] font-medium transition-colors ${
    active ? "bg-ink-solid text-white" : "text-muted hover:text-foreground"
  }`;

// Deliberately lighter weight than the period pills: a quiet outline at
// rest, a soft violet tint (never a solid fill) once activated. Kept
// small/content-width — a single-select filter is not a large panel.
function SecondaryFilterChip({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium transition-colors ${
            active
              ? "border-violet-400 bg-violet-50 text-violet-600"
              : "border-border text-muted hover:border-muted-2 hover:text-foreground"
          }`}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52" align="start">
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function TransactionsToolbar({
  accounts,
  books,
  categories,
  filters,
  paydayAnchorDay,
  onChange,
}: {
  accounts: { id: string; name: string }[];
  books: { id: string; name: string }[];
  categories: CategoryInfo[];
  filters: FiltersState;
  paydayAnchorDay: number | null;
  onChange: (patch: Partial<FiltersState>) => void;
}) {
  const bookName = filters.bookId ? books.find((b) => b.id === filters.bookId)?.name : null;
  const accountName = filters.accountId
    ? accounts.find((a) => a.id === filters.accountId)?.name
    : null;
  const hasAmount = filters.amountMin !== "" || filters.amountMax !== "";
  const categoryLabel =
    filters.categoryIds.length > 0 ? `Category: ${filters.categoryIds.length}` : "Category";

  function toggleCategory(id: string) {
    const next = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((c) => c !== id)
      : [...filters.categoryIds, id];
    onChange({ categoryIds: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
      {PERIOD_PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => {
            const range = getPresetRange(p.key, paydayAnchorDay);
            onChange({ period: p.key, dateFrom: range.from, dateTo: range.to });
          }}
          className={periodButtonClass(filters.period === p.key)}
        >
          {p.label}
        </button>
      ))}

      <DateRangePicker
        from={filters.dateFrom}
        to={filters.dateTo}
        active={filters.period === "custom"}
        label={filters.period === "custom" ? `${filters.dateFrom} – ${filters.dateTo}` : "Custom range"}
        onChange={(from, to) => onChange({ period: "custom", dateFrom: from, dateTo: to })}
      />

      <span className="mx-1 h-4 w-px bg-border" />

      {/* Progressive disclosure: the word "book" appears nowhere until a
          second book exists — filtering by book is meaningless otherwise. */}
      {books.length > 1 && (
        <SecondaryFilterChip label={bookName ? `Book: ${bookName}` : "Book"} active={!!filters.bookId}>
          <Select
            value={filters.bookId ?? ALL}
            onValueChange={(v) => onChange({ bookId: v === ALL ? null : v })}
          >
            <SelectItem value={ALL}>All books</SelectItem>
            {books.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </Select>
        </SecondaryFilterChip>
      )}

      <SecondaryFilterChip
        label={accountName ? `Account: ${accountName}` : "Account"}
        active={!!filters.accountId}
      >
        <Select
          value={filters.accountId ?? ALL}
          onValueChange={(v) => onChange({ accountId: v === ALL ? null : v })}
        >
          <SelectItem value={ALL}>All accounts</SelectItem>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </Select>
      </SecondaryFilterChip>

      {categories.length > 0 && (
        <SecondaryFilterChip label={categoryLabel} active={filters.categoryIds.length > 0}>
          <div className="themed-scrollbar flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {categories.map((c) => {
              const checked = filters.categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-canvas"
                >
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                      checked ? "border-violet-600 bg-violet-600 text-white" : "border-border"
                    }`}
                  >
                    {checked && <CheckIcon className="h-2.5 w-2.5" />}
                  </span>
                  <CategoryBadge category={c} />
                </button>
              );
            })}
          </div>
        </SecondaryFilterChip>
      )}

      <SecondaryFilterChip
        label={
          hasAmount ? `Amount: ${filters.amountMin || "0"}–${filters.amountMax || "∞"}` : "Amount"
        }
        active={hasAmount}
      >
        <div className="flex items-end gap-1.5">
          <Input
            label="Min"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            prefix="€"
            value={filters.amountMin}
            onChange={(e) => onChange({ amountMin: sanitizeAmountInput(e.target.value) })}
            className="w-full"
          />
          <Input
            label="Max"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            prefix="€"
            value={filters.amountMax}
            onChange={(e) => onChange({ amountMax: sanitizeAmountInput(e.target.value) })}
            className="w-full"
          />
        </div>
      </SecondaryFilterChip>

      {filters.recipient && (
        <>
          <span className="mx-1 h-4 w-px bg-border" />
          <SecondaryFilterChip label={`Recipient: ${filters.recipient}`} active>
            <p className="mb-2 text-[12.5px] text-muted">Filtering by recipient.</p>
            <button
              type="button"
              onClick={() => onChange({ recipient: null })}
              className="text-[12.5px] font-medium text-violet-600 hover:underline"
            >
              Clear recipient filter
            </button>
          </SecondaryFilterChip>
        </>
      )}
    </div>
  );
}
