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
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

// The period selector's own pill styling (active = solid ink, inactive =
// plain text) — the single heaviest control in the toolbar.
const periodButtonClass = (active: boolean) =>
  `inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium transition-colors ${
    active ? "bg-ink-solid text-white" : "text-muted hover:text-foreground"
  }`;

// Deliberately lighter weight than the period pills: a quiet outline at
// rest, a soft violet tint (never a solid fill) once activated.
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
          className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors ${
            active
              ? "border-violet-400 bg-violet-50 text-violet-600"
              : "border-border text-muted hover:border-muted-2 hover:text-foreground"
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

// Keeps the amount fields numeric without a native number input's spinner
// arrows: digits, a single leading minus, a single decimal point.
function sanitizeAmountInput(raw: string): string {
  const negative = raw.trim().startsWith("-");
  let value = raw.replace(/[^0-9.]/g, "");
  const firstDot = value.indexOf(".");
  if (firstDot !== -1) {
    value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, "");
  }
  return (negative ? "-" : "") + value;
}

export function TransactionsToolbar({
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
    filters.categoryIds.length > 0 ? `Category: ${filters.categoryIds.length}` : "Category";

  function toggleCategory(id: string) {
    const next = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((c) => c !== id)
      : [...filters.categoryIds, id];
    onChange({ categoryIds: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 py-3">
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

      <span className="mx-1.5 h-5 w-px bg-border" />

      {spaces.length > 0 && (
        <SecondaryFilterChip label={spaceName ? `Space: ${spaceName}` : "Space"} active={!!filters.spaceId}>
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
          <div className="themed-scrollbar flex max-h-72 flex-col gap-1 overflow-y-auto">
            {categories.map((c) => {
              const checked = filters.categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-canvas"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked ? "border-violet-600 bg-violet-600 text-white" : "border-border"
                    }`}
                  >
                    {checked && <CheckIcon className="h-3 w-3" />}
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
        <div className="flex items-end gap-2">
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
          <span className="mx-1.5 h-5 w-px bg-border" />
          <SecondaryFilterChip label={`Recipient: ${filters.recipient}`} active>
            <p className="mb-2 text-[13px] text-muted">Filtering by recipient.</p>
            <button
              type="button"
              onClick={() => onChange({ recipient: null })}
              className="text-[13px] font-medium text-violet-600 hover:underline"
            >
              Clear recipient filter
            </button>
          </SecondaryFilterChip>
        </>
      )}
    </div>
  );
}
