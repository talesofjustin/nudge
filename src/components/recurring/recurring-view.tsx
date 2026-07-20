"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RecurringSummary } from "@/components/recurring/recurring-summary";
import { RecurringToolbar } from "@/components/recurring/recurring-toolbar";
import { RecurringContextStrip } from "@/components/recurring/recurring-context-strip";
import { RecurringRow } from "@/components/recurring/recurring-row";
import type { CategoryInfo } from "@/components/transactions/category-badge";
import { confirmRecurring, dismissRecurring, type RecurringItem } from "@/app/(app)/recurring/actions";

const COLUMNS = ["", "Recipient", "Amount", "Interval", "Category", "Last charged", "Next expected", ""];

export function RecurringView({
  items: initialItems,
  categories,
  accounts,
}: {
  items: RecurringItem[];
  categories: CategoryInfo[];
  accounts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [showOnlyUnreviewed, setShowOnlyUnreviewed] = useState(false);
  const [showOnlyStale, setShowOnlyStale] = useState(false);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);

  const confirmedItems = items.filter((i) => i.status === "confirmed");
  const unreviewedCount = items.filter((i) => i.status === "detected").length;
  const staleCount = items.filter((i) => i.isStale).length;

  const monthlyCost = confirmedItems.reduce((sum, i) => sum + i.monthlyCost, 0);
  const annualCost = confirmedItems.reduce((sum, i) => sum + i.annualCost, 0);

  const visibleItems = items.filter((i) => {
    if (categoryIds.length > 0 && (!i.categoryId || !categoryIds.includes(i.categoryId))) return false;
    if (showOnlyUnreviewed && i.status !== "detected") return false;
    if (showOnlyStale && !i.isStale) return false;
    return true;
  });

  async function handleConfirm(groupId: string) {
    setItems((prev) => prev.map((i) => (i.groupId === groupId ? { ...i, status: "confirmed" } : i)));
    await confirmRecurring(groupId);
    router.refresh();
  }

  async function handleDismiss(groupId: string) {
    setItems((prev) => prev.filter((i) => i.groupId !== groupId));
    await dismissRecurring(groupId);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <RecurringSummary monthlyCost={monthlyCost} annualCost={annualCost} count={confirmedItems.length} />

      <div className="shadow-soft overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border">
          <RecurringToolbar categories={categories} categoryIds={categoryIds} onChangeCategoryIds={setCategoryIds} />
        </div>

        <RecurringContextStrip
          count={visibleItems.length}
          unreviewedCount={unreviewedCount}
          showOnlyUnreviewed={showOnlyUnreviewed}
          onToggleUnreviewed={() => setShowOnlyUnreviewed((v) => !v)}
          staleCount={staleCount}
          showOnlyStale={showOnlyStale}
          onToggleStale={() => setShowOnlyStale((v) => !v)}
        />

        {visibleItems.length === 0 ? (
          <p className="px-4 py-12 text-center text-[13px] text-muted">
            {items.length === 0
              ? "No recurring subscriptions detected yet — import a few months of statements and check back."
              : "Nothing matches these filters."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col style={{ width: "4%" }} />
                <col style={{ width: "21%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "23%" }} />
              </colgroup>
              <thead>
                <tr className="bg-canvas">
                  {COLUMNS.map((label, i) => (
                    <th
                      key={i}
                      className={`sticky top-0 z-10 truncate border-b border-border bg-canvas px-3 py-2 text-[11px] font-medium tracking-wide text-muted uppercase ${
                        i === 2 ? "text-right" : "text-left"
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <RecurringRow
                    key={item.groupId}
                    item={item}
                    accountName={item.accountId ? (accountsById.get(item.accountId) ?? "Unknown account") : "Unknown account"}
                    categories={categories}
                    onConfirm={handleConfirm}
                    onDismiss={handleDismiss}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
