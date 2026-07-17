"use client";

import { Card } from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FilterChip } from "@/components/ui/pill";
import { CategoryBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import { getPresetRange, type DatePreset } from "@/lib/date-presets";

const ALL = "__all__";

export type FiltersState = {
  spaceId: string | null;
  accountId: string | null;
  categoryIds: string[];
  amountMin: string;
  amountMax: string;
  dateFrom: string | null;
  dateTo: string | null;
};

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
  { key: "all", label: "All time" },
];

// The active preset (if any) is derived from the current dateFrom/dateTo
// rather than tracked as separate state — a custom date input change and a
// preset click both just set dateFrom/dateTo, so there's one source of
// truth and no risk of the two getting out of sync.
function getActivePreset(dateFrom: string | null, dateTo: string | null): DatePreset | null {
  for (const preset of ["week", "month", "quarter", "all"] as DatePreset[]) {
    const range = getPresetRange(preset);
    if (range.from === dateFrom && range.to === dateTo) return preset;
  }
  return null;
}

export function TransactionsFilters({
  accounts,
  spaces,
  categories,
  filters,
  onChange,
}: {
  accounts: { id: string; name: string }[];
  spaces: { id: string; name: string }[];
  categories: CategoryInfo[];
  filters: FiltersState;
  onChange: (patch: Partial<FiltersState>) => void;
}) {
  const activePreset = getActivePreset(filters.dateFrom, filters.dateTo);

  function toggleCategory(id: string) {
    const next = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((c) => c !== id)
      : [...filters.categoryIds, id];
    onChange({ categoryIds: next });
  }

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-muted">Date range</span>
        <div className="flex flex-wrap items-center gap-2">
          {DATE_PRESETS.map((p) => (
            <FilterChip
              key={p.key}
              active={activePreset === p.key}
              onClick={() => {
                const range = getPresetRange(p.key);
                onChange({ dateFrom: range.from, dateTo: range.to });
              }}
            >
              {p.label}
            </FilterChip>
          ))}
          <span className="mx-1 text-[13px] text-muted-2">or custom:</span>
          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) => onChange({ dateFrom: e.target.value || null })}
            className="h-8 rounded-lg border border-border bg-canvas px-2 text-[13px] text-foreground outline-none focus:border-violet-400"
          />
          <span className="text-[13px] text-muted-2">to</span>
          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) => onChange({ dateTo: e.target.value || null })}
            className="h-8 rounded-lg border border-border bg-canvas px-2 text-[13px] text-foreground outline-none focus:border-violet-400"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {spaces.length > 0 && (
          <div className="w-44">
            <Select
              label="Space"
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
          </div>
        )}

        <div className="w-48">
          <Select
            label="Account"
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
        </div>

        <div className="flex items-end gap-2">
          <Input
            label="Min amount"
            type="number"
            placeholder="0.00"
            value={filters.amountMin}
            onChange={(e) => onChange({ amountMin: e.target.value })}
            className="w-28"
          />
          <Input
            label="Max amount"
            type="number"
            placeholder="0.00"
            value={filters.amountMax}
            onChange={(e) => onChange({ amountMax: e.target.value })}
            className="w-28"
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-muted">Category</span>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const active = filters.categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`rounded-full transition-opacity ${active ? "" : "opacity-40 hover:opacity-70"}`}
                >
                  <CategoryBadge category={c} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
