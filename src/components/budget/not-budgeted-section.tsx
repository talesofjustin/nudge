"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CategoryBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import { sanitizeAmountInput } from "@/lib/sanitize-amount";

function QuickSetBudgetPopover({
  categoryName,
  onSet,
}: {
  categoryName: string;
  onSet: (amount: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const amount = Number(value.trim());
    if (!value.trim() || Number.isNaN(amount) || amount < 0) return;
    setSaving(true);
    await onSet(amount);
    setSaving(false);
    setOpen(false);
    setValue("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setValue("");
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className="text-[12.5px] font-medium text-violet-600 hover:underline">
          Set budget
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <Input
          label={`Monthly budget for ${categoryName}`}
          type="text"
          inputMode="decimal"
          prefix="€"
          placeholder="0.00"
          value={value}
          onChange={(e) => setValue(sanitizeAmountInput(e.target.value))}
          autoFocus
        />
        <Button
          type="button"
          className="mt-3 h-8 w-full text-[13px]"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function NotBudgetedSection({
  items,
  onSetBudget,
}: {
  items: { category: CategoryInfo; spent: number }[];
  onSetBudget: (categoryId: string, amount: number) => Promise<void>;
}) {
  if (items.length === 0) return null;

  return (
    <div className="border-t border-border">
      <p className="px-4 pt-4 text-[11px] font-medium tracking-wide text-muted-2 uppercase">
        Not budgeted
      </p>
      <div className="flex flex-col">
        {items.map(({ category, spent }) => (
          <div key={category.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <CategoryBadge category={category} />
              <span className="text-[13px] text-muted">€{spent.toFixed(2)} spent</span>
            </div>
            <QuickSetBudgetPopover
              categoryName={category.name}
              onSet={(amount) => onSetBudget(category.id, amount)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
