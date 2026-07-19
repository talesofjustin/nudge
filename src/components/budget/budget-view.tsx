"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MonthNav } from "@/components/budget/month-nav";
import { BudgetSummary } from "@/components/budget/budget-summary";
import { CategoryProgressRow } from "@/components/budget/category-progress-row";
import { NotBudgetedSection } from "@/components/budget/not-budgeted-section";
import { BudgetEditSection } from "@/components/budget/budget-edit-section";
import { EnvelopeTip } from "@/components/budget/envelope-tip";
import type { CategoryInfo } from "@/components/transactions/category-badge";
import { getFinancialMonthRange, shiftFinancialMonth, financialMonthBudgetKey } from "@/lib/financial-month";
import { budgetMonthToSearchParams, type BudgetMonth } from "@/lib/budget-filters";
import { getBudgetProgress, upsertBudget, type BudgetProgressResult } from "@/app/(app)/budget/actions";

function daysBetweenInclusive(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
}

export function BudgetView({
  categories,
  initialMonth,
  initialProgress,
  paydayAnchorDay,
  budgetTipDismissed,
}: {
  categories: CategoryInfo[];
  initialMonth: BudgetMonth;
  initialProgress: BudgetProgressResult;
  paydayAnchorDay: number | null;
  budgetTipDismissed: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [month, setMonth] = useState<BudgetMonth>(initialMonth);
  const [progress, setProgress] = useState<BudgetProgressResult>(initialProgress);
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const monthKey = financialMonthBudgetKey(month.from);

  const todayFinancialMonth = useMemo(
    () => getFinancialMonthRange(new Date(), paydayAnchorDay),
    [paydayAnchorDay],
  );
  const isCurrentMonth = month.from === todayFinancialMonth.from && month.to === todayFinancialMonth.to;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    router.replace(`${pathname}?${budgetMonthToSearchParams(month).toString()}`, { scroll: false });

    (async () => {
      setLoading(true);
      const res = await getBudgetProgress(month.from, month.to);
      setLoading(false);
      setProgress(res);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  function navigate(direction: "prev" | "next") {
    setMonth((prev) => shiftFinancialMonth(prev, paydayAnchorDay, direction));
  }

  async function refreshProgress() {
    const res = await getBudgetProgress(month.from, month.to);
    setProgress(res);
  }

  async function handleSetBudget(categoryId: string, amount: number) {
    await upsertBudget(monthKey, categoryId, amount);
    await refreshProgress();
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

        <BudgetSummary
          totalBudgeted={progress.totalBudgeted}
          totalSpent={progress.totalSpent}
          dayOfMonth={dayOfMonth}
          totalDays={totalDays}
          isCurrentMonth={isCurrentMonth}
        />

        {loading && <p className="px-4 py-3 text-[13px] text-muted">Updating…</p>}

        {!loading && budgetedRows.length === 0 && notBudgetedItems.length === 0 ? (
          <p className="px-4 py-12 text-center text-[13px] text-muted">
            No budgets or spending recorded for this month yet.
          </p>
        ) : (
          <>
            <div className="flex flex-col divide-y divide-border">
              {budgetedRows.map((row) => (
                <CategoryProgressRow
                  key={row.categoryId}
                  category={row.category}
                  spent={row.spent}
                  budgeted={row.budgeted!}
                />
              ))}
            </div>

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
        onSaved={refreshProgress}
      />
    </div>
  );
}

function toISOToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
