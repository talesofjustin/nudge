"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CategoryBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import { ChevronRightIcon } from "@/components/icons/dashboard-icons";
import { sanitizeAmountInput } from "@/lib/sanitize-amount";
import {
  getBudgetSuggestions,
  upsertBudget,
  deleteBudget,
  copyLastMonthBudgets,
  type CategorySuggestion,
} from "@/app/(app)/budget/actions";

export function BudgetEditSection({
  categories,
  budgetsByCategory,
  monthKey,
  monthFrom,
  monthTo,
  bookId,
  open,
  onOpenChange,
  prefillSuggestions = false,
  onSaved,
}: {
  categories: CategoryInfo[];
  budgetsByCategory: Map<string, number>;
  monthKey: string;
  monthFrom: string;
  monthTo: string;
  bookId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // True only when opened via the "Set up budgets" onboarding action — pre-
  // fills every category's draft with its suggested amount so it's visibly
  // ready to accept, rather than making the user open each suggestion by
  // hand. A normal manual re-open never overwrites existing drafts this way.
  prefillSuggestions?: boolean;
  onSaved: () => void;
}) {
  const [suggestions, setSuggestions] = useState<Map<string, CategorySuggestion> | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [drafts, setDrafts] = useState<Map<string, string>>(new Map());
  const [copying, setCopying] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [hasPrefilled, setHasPrefilled] = useState(false);

  useEffect(() => {
    if (!open || suggestions !== null || loadingSuggestions) return;
    (async () => {
      setLoadingSuggestions(true);
      const result = await getBudgetSuggestions(monthFrom, monthTo, bookId);
      setSuggestions(new Map(result.map((s) => [s.categoryId, s])));
      setLoadingSuggestions(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!prefillSuggestions || !suggestions || hasPrefilled) return;
    (() => {
      setDrafts((prev) => {
        const next = new Map(prev);
        for (const [categoryId, suggestion] of suggestions) {
          if (!budgetsByCategory.has(categoryId)) next.set(categoryId, suggestion.average.toFixed(2));
        }
        return next;
      });
      setHasPrefilled(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions, prefillSuggestions, hasPrefilled]);

  function draftValue(categoryId: string): string {
    if (drafts.has(categoryId)) return drafts.get(categoryId)!;
    const existing = budgetsByCategory.get(categoryId);
    return existing !== undefined ? String(existing) : "";
  }

  function clearDraft(categoryId: string) {
    setDrafts((prev) => {
      const next = new Map(prev);
      next.delete(categoryId);
      return next;
    });
  }

  async function commitDraft(categoryId: string) {
    if (!drafts.has(categoryId)) return; // untouched, nothing to save
    const raw = drafts.get(categoryId)!.trim();

    if (raw === "") {
      if (budgetsByCategory.has(categoryId)) {
        await deleteBudget(monthKey, categoryId, bookId);
        clearDraft(categoryId);
        onSaved();
      } else {
        clearDraft(categoryId);
      }
      return;
    }

    const amount = Number(raw);
    if (Number.isNaN(amount) || amount < 0) return;
    await upsertBudget(monthKey, categoryId, amount, bookId);
    clearDraft(categoryId);
    onSaved();
  }

  async function handleUseSuggestion(categoryId: string, amount: number) {
    setDrafts((prev) => new Map(prev).set(categoryId, amount.toFixed(2)));
    await upsertBudget(monthKey, categoryId, amount, bookId);
    clearDraft(categoryId);
    onSaved();
  }

  async function handleCopyLastMonth() {
    setCopying(true);
    setCopyMessage(null);
    const res = await copyLastMonthBudgets(monthFrom, monthTo, bookId);
    setCopying(false);
    setDrafts(new Map());
    setCopyMessage(
      res.count > 0
        ? `Copied ${res.count} budget${res.count === 1 ? "" : "s"} from last month.`
        : "No budgets found for last month.",
    );
    if (res.count > 0) onSaved();
  }

  return (
    <div className="shadow-soft mt-5 overflow-hidden rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="text-[14px] font-semibold text-foreground">Edit budgets</span>
        <ChevronRightIcon
          className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <p className="text-[12.5px] text-muted">Set an amount per category for this month.</p>
            <Button
              variant="secondary"
              type="button"
              className="h-8 px-3 text-[13px]"
              onClick={handleCopyLastMonth}
              disabled={copying}
            >
              {copying ? "Copying…" : "Copy last month"}
            </Button>
          </div>
          {copyMessage && <p className="px-4 pb-2 text-[12px] text-mint">{copyMessage}</p>}

          <div className="flex flex-col divide-y divide-border">
            {categories.map((category) => {
              const suggestion = suggestions?.get(category.id);
              return (
                <div key={category.id} className="flex flex-wrap items-center gap-4 px-4 py-2.5">
                  <div className="w-40 shrink-0">
                    <CategoryBadge category={category} />
                  </div>
                  <div className="w-32 shrink-0">
                    <Input
                      aria-label={`Budget for ${category.name}`}
                      type="text"
                      inputMode="decimal"
                      prefix="€"
                      placeholder="0.00"
                      value={draftValue(category.id)}
                      onChange={(e) =>
                        setDrafts((prev) =>
                          new Map(prev).set(category.id, sanitizeAmountInput(e.target.value)),
                        )
                      }
                      onBlur={() => commitDraft(category.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      className="h-9"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-[12.5px]">
                    {loadingSuggestions ? (
                      <span className="text-muted-2">Loading…</span>
                    ) : suggestion ? (
                      <button
                        type="button"
                        onClick={() => handleUseSuggestion(category.id, suggestion.average)}
                        className="font-medium text-violet-600 hover:underline"
                      >
                        Avg last {suggestion.monthsUsed} month{suggestion.monthsUsed === 1 ? "" : "s"}:
                        €{suggestion.average.toFixed(2)} — use this
                      </button>
                    ) : (
                      <span className="text-muted-2">No history yet</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
