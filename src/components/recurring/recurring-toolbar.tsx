"use client";

import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CategoryBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import { CheckIcon } from "@/components/icons/dashboard-icons";

// Same quiet-outline / soft-violet-when-active treatment as the
// transactions toolbar's filter chips.
function FilterChip({ label, active, children }: { label: string; active: boolean; children: ReactNode }) {
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
      <PopoverContent className="w-56" align="start">
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function RecurringToolbar({
  categories,
  categoryIds,
  onChangeCategoryIds,
}: {
  categories: CategoryInfo[];
  categoryIds: string[];
  onChangeCategoryIds: (ids: string[]) => void;
}) {
  const label = categoryIds.length > 0 ? `Category: ${categoryIds.length}` : "Category";

  function toggle(id: string) {
    onChangeCategoryIds(
      categoryIds.includes(id) ? categoryIds.filter((c) => c !== id) : [...categoryIds, id],
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
      {categories.length > 0 && (
        <FilterChip label={label} active={categoryIds.length > 0}>
          <div className="themed-scrollbar flex max-h-64 flex-col gap-0.5 overflow-y-auto">
            {categories.map((c) => {
              const checked = categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
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
        </FilterChip>
      )}
    </div>
  );
}
