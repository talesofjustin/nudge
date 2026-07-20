"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MonthNav } from "@/components/budget/month-nav";
import { BudgetSummary } from "@/components/budget/budget-summary";
import { BudgetOnboarding } from "@/components/budget/budget-onboarding";
import { CategoryProgressRow } from "@/components/budget/category-progress-row";
import { NotBudgetedSection } from "@/components/budget/not-budgeted-section";
import { BudgetEditSection } from "@/components/budget/budget-edit-section";
import { EnvelopeTip } from "@/components/budget/envelope-tip";
import type { CategoryInfo } from "@/components/transactions/category-badge";
import type { BookInfo } from "@/components/transactions/book-picker";
import { getFinancialMonthRange, shiftFinancialMonth, financialMonthBudgetKey } from "@/lib/financial-month";
import { budgetSearchParams, type BudgetMonth } from "@/lib/budget-filters";
import { getBudgetProgress, upsertBudget, type BudgetProgressResult } from "@/app/(app)/budget/actions";

function daysBetweenInclusive(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
}

export function BudgetView({
  categories,
  books,
  initialMonth,
  initialBookId,
  initialProgress,
  paydayAnchorDay,
  budgetTipDismissed,
}: {
  categories: CategoryInfo[];
  books: BookInfo[];
  initialMonth: BudgetMonth;
  initialBookId: string | null;
  initialProgress: BudgetProgressResult;
  paydayAnchorDay: number | null;
  budgetTipDismissed: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Book selector only exists once a second book does — for 0-1 books,
  // bookId always stays null (the "global" budget) and the word "book"
  // never appears anywhere on this page.
  const showBookFeature = books.length > 1;

  const [month, setMonth] = useState<BudgetMonth>(initialMonth);
  const [bookId, setBookId] = useState<string | null>(showBookFeature ? initialBookId : null);
  const [progress, setProgress] = useState<BudgetProgressResult>(initialProgress);
  const [loading, setLoading] = useState(false);
  const [lastMonthSpent, setLastMonthSpent] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [prefillSuggestions, setPrefillSuggestions] = useState(false);
  const isFirstRender = useRef(true);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const monthKey = financialMonthBudgetKey(month.from);

  const todayFinancialMonth = useMemo(
    () => getFinancialMonthRange(new Date(), paydayAnchorDay),
    [paydayAnchorDay],
  );
  const isCurrentMonth = month.from === todayFinancialMonth.from && month.to === todayFinancialMonth.to;

  const hasBudgets = progress.rows.some((r) => r.budgeted !== null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    router.replace(`${pathname}?${budgetSearchParams(month, bookId).toString()}`, { scroll: false });

    (async () => {
      setLoading(true);
      const res = await getBudgetProgress(month.from, month.to, bookId);
      setLoading(false);
      setProgress(res);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, bookId]);

  // Only fetched for the empty-state's "for context" line — no need to
  // pay for this request once a budget actually exists.
  useEffect(() => {
    if (hasBudgets) return;
    let cancelled = false;
    (async () => {
      const prevMonth = shiftFinancialMonth(month, paydayAnchorDay, "prev");
      const prevProgress = await getBudgetProgress(prevMonth.from, prevMonth.to, bookId);
      if (!cancelled) setLastMonthSpent(prevProgress.totalSpent);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBudgets, month, bookId]);

  function navigate(direction: "prev" | "next") {
    setMonth((prev) => shiftFinancialMonth(prev, paydayAnchorDay, direction));
  }

  async function refreshProgress() {
    const res = await getBudgetProgress(month.from, month.to, bookId);
    setProgress(res);
  }

  async function handleSetBudget(categoryId: string, amount: number) {
    await upsertBudget(monthKey, categoryId, amount, bookId);
    await refreshProgress();
  }

  function handleSetupBudgets() {
    setPrefillSuggestions(true);
    setEditOpen(true);
  }

  const budgetedRows = progress.rows
    .filter((r) => r.budgeted !== null)
    .map((r) => ({ ...r, category: categoriesById.get(r.categoryId) }))
    .filter((r): r is typeof r & { category: CategoryInfo } => !!r.category)
    .sort((a, b) => {
      const pctA = a.budgeted! > 0 ? a.spent / a.budgeted! : a.spent > 0 ? 1 : 0;
      const pctB = b.budgeted! > 0 ? b.spent / b.budgeted! : b.spent > 0 ? 1 : 0;
      return pctB - pctA;
    });

  const spendingRows = budgetedRows.filter((r) => r.category.kind !== "saving");
  const savingRows = budgetedRows.filter((r) => r.category.kind === "saving");

  const notBudgetedItems = progress.rows
    .filter((r) => r.budgeted === null)
    .map((r) => ({ category: categoriesById.get(r.categoryId), spent: r.spent }))
    .filter((r): r is { category: CategoryInfo; spent: number } => !!r.category)
    .sort((a, b) => b.spent - a.spent);

  const budgetsByCategory = new Map(
    progress.rows.filter((r) => r.budgeted !== null).map((r) => [r.categoryId, r.budgeted!]),
  );

  const dayOfMonth = isCurrentMonth ? daysBetweenInclusive(month.from, toISOToday()) : 0;
  const totalDays = daysBetweenInclusive(month.from, month.to);

  return (
    <div className="flex flex-col gap-5">
      <EnvelopeTip initiallyDismissed={budgetTipDismissed} />

      <div className="shadow-soft overflow-hidden rounded-xl border border-border bg-surface">
        {showBookFeature && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5">
            {books.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBookId(b.id)}
                className={`inline-flex h-7 items-center rounded-full px-2.5 text-[12.5px] font-medium transition-colors ${
                  bookId === b.id ? "bg-ink-solid text-white" : "text-muted hover:text-foreground"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}

        <div className="border-b border-border">
          <MonthNav
            from={month.from}
            to={month.to}
            isCurrentMonth={isCurrentMonth}
            onPrev={() => navigate("prev")}
            onNext={() => navigate("next")}
            onToday={() => setMonth(todayFinancialMonth)}
          />
        </div>

        {hasBudgets ? (
          <BudgetSummary
            totalBudgeted={progress.totalBudgeted}
            totalSpent={progress.totalSpent}
            totalSaved={progress.totalSaved}
            totalSavingTarget={progress.totalSavingTarget}
            dayOfMonth={dayOfMonth}
            totalDays={totalDays}
            isCurrentMonth={isCurrentMonth}
            unassignedCount={showBookFeature ? progress.unassignedCount : 0}
          />
        ) : (
          <BudgetOnboarding lastMonthSpent={lastMonthSpent} onSetup={handleSetupBudgets} />
        )}

        {loading && <p className="px-4 py-3 text-[13px] text-muted">Updating…</p>}

        {!loading && budgetedRows.length === 0 && notBudgetedItems.length === 0 ? (
          hasBudgets && (
            <p className="px-4 py-12 text-center text-[13px] text-muted">
              No budgets or spending recorded for this month yet.
            </p>
          )
        ) : (
          <>
            {spendingRows.length > 0 && (
              <div>
                <p className="px-4 pt-3 text-[11px] font-medium tracking-wide text-muted-2 uppercase">Spending</p>
                <div className="flex flex-col divide-y divide-border">
                  {spendingRows.map((row) => (
                    <CategoryProgressRow key={row.categoryId} category={row.category} spent={row.spent} budgeted={row.budgeted!} />
                  ))}
                </div>
              </div>
            )}

            {savingRows.length > 0 && (
              <div className="border-t border-border">
                <p className="px-4 pt-3 text-[11px] font-medium tracking-wide text-muted-2 uppercase">Saving</p>
                <div className="flex flex-col divide-y divide-border">
                  {savingRows.map((row) => (
                    <CategoryProgressRow key={row.categoryId} category={row.category} spent={row.spent} budgeted={row.budgeted!} />
                  ))}
                </div>
              </div>
            )}

            <NotBudgetedSection items={notBudgetedItems} onSetBudget={handleSetBudget} />
          </>
        )}
      </div>

      <BudgetEditSection
        categories={categories}
        budgetsByCategory={budgetsByCategory}
        monthKey={monthKey}
        monthFrom={month.from}
        monthTo={month.to}
        bookId={bookId}
        open={editOpen}
        onOpenChange={(next) => {
          setEditOpen(next);
          if (!next) setPrefillSuggestions(false);
        }}
        prefillSuggestions={prefillSuggestions}
        onSaved={refreshProgress}
      />
    </div>
  );
}

function toISOToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
