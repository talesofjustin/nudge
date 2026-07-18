"use client";

import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { CategoryBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import { CheckIcon } from "@/components/icons/dashboard-icons";
import { getPresetRange, type DatePreset } from "@/lib/date-presets";
import type { FiltersState } from "@/lib/transaction-filters";

const ALL = "__all__";

const PERIOD_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
];

function FilterPopoverChip({
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
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
            active
              ? "bg-ink-solid text-white"
              : "border border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function TransactionsFilters({
  accounts,
  spaces,
  categories,
  filters,
  paydayAnchorDay,
  onChange,
}: {
  accounts: { id: string; name: string }[];
  spaces: { id: string; name: string }[];
  categories: CategoryInfo[];
  filters: FiltersState;
  paydayAnchorDay: number | null;
  onChange: (patch: Partial<FiltersState>) => void;
}) {
  const spaceName = filters.spaceId ? spaces.find((s) => s.id === filters.spaceId)?.name : null;
  const accountName = filters.accountId
    ? accounts.find((a) => a.id === filters.accountId)?.name
    : null;
  const hasAmount = filters.amountMin !== "" || filters.amountMax !== "";
  const categoryLabel =
    filters.categoryIds.length > 0 ? `Category (${filters.categoryIds.length})` : "Category";

  function toggleCategory(id: string) {
    const next = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((c) => c !== id)
      : [...filters.categoryIds, id];
    onChange({ categoryIds: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIOD_PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => {
            const range = getPresetRange(p.key, paydayAnchorDay);
            onChange({ period: p.key, dateFrom: range.from, dateTo: range.to });
          }}
          className={`inline-flex h-9 items-center rounded-full px-3.5 text-[13px] font-medium transition-colors ${
            filters.period === p.key
              ? "bg-ink-solid text-white"
              : "border border-border bg-surface text-muted hover:text-foreground"
          }`}
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

      <span className="mx-1 h-5 w-px bg-border" />

      {spaces.length > 0 && (
        <FilterPopoverChip label={spaceName ? `Space: ${spaceName}` : "Space"} active={!!filters.spaceId}>
          <Select
            value={filters.spaceId ?? ALL}
            onValueChange={(v) => onChange({ spaceId: v === ALL ? null : v })}
          >
            <SelectItem value={ALL}>All spaces</SelectItem>
            {spaces.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </Select>
        </FilterPopoverChip>
      )}

      <FilterPopoverChip label={accountName ? `Account: ${accountName}` : "Account"} active={!!filters.accountId}>
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
      </FilterPopoverChip>

      {categories.length > 0 && (
        <FilterPopoverChip label={categoryLabel} active={filters.categoryIds.length > 0}>
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {categories.map((c) => {
              const checked = filters.categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className="flex items-center justify-between rounded-xl px-2 py-1.5 text-left hover:bg-canvas"
                >
                  <CategoryBadge category={c} />
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked ? "border-violet-600 bg-violet-600 text-white" : "border-border"
                    }`}
                  >
                    {checked && <CheckIcon className="h-3 w-3" />}
                  </span>
                </button>
              );
            })}
          </div>
        </FilterPopoverChip>
      )}

      <FilterPopoverChip
        label={
          hasAmount
            ? `Amount: ${filters.amountMin || "0"}–${filters.amountMax || "∞"}`
            : "Amount"
        }
        active={hasAmount}
      >
        <div className="flex items-end gap-2">
          <Input
            label="Min"
            type="number"
            placeholder="0.00"
            value={filters.amountMin}
            onChange={(e) => onChange({ amountMin: e.target.value })}
            className="w-full"
          />
          <Input
            label="Max"
            type="number"
            placeholder="0.00"
            value={filters.amountMax}
            onChange={(e) => onChange({ amountMax: e.target.value })}
            className="w-full"
          />
        </div>
      </FilterPopoverChip>

      {filters.recipient && (
        <>
          <span className="mx-1 h-5 w-px bg-border" />
          <FilterPopoverChip label={`Recipient: ${filters.recipient}`} active>
            <p className="mb-2 text-[13px] text-muted">Filtering by recipient.</p>
            <button
              type="button"
              onClick={() => onChange({ recipient: null })}
              className="text-[13px] font-medium text-violet-600 hover:underline"
            >
              Clear recipient filter
            </button>
          </FilterPopoverChip>
        </>
      )}
    </div>
  );
}
