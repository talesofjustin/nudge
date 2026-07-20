"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategoryBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import { ChevronRightIcon, TrendingUpIcon } from "@/components/icons/dashboard-icons";
import { formatInterval } from "@/lib/format-interval";
import type { RecurringItem } from "@/app/(app)/recurring/actions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatAmount(amount: number): string {
  return `${amount > 0 ? "+" : "-"}€${Math.abs(amount).toFixed(2)}`;
}

export function RecurringRow({
  item,
  accountName,
  categories,
  onConfirm,
  onDismiss,
}: {
  item: RecurringItem;
  accountName: string;
  categories: CategoryInfo[];
  onConfirm: (groupId: string) => void;
  onDismiss: (groupId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [working, setWorking] = useState(false);
  const category = categories.find((c) => c.id === item.categoryId) ?? null;

  async function handleConfirm() {
    setWorking(true);
    await onConfirm(item.groupId);
    setWorking(false);
  }

  async function handleDismiss() {
    setWorking(true);
    await onDismiss(item.groupId);
    setWorking(false);
  }

  return (
    <>
      <tr className="group border-b border-border last:border-0 hover:bg-canvas">
        <td className="px-3 py-3 text-center align-middle">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-muted-2 transition-colors hover:bg-canvas hover:text-foreground ${
              expanded ? "rotate-90" : ""
            }`}
          >
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
        </td>
        <td className="px-3 py-3 align-middle">
          <p className="truncate text-[13.5px] font-medium text-foreground">{item.label}</p>
          {item.status === "detected" && (
            <p className="mt-0.5 text-[11px] font-medium text-violet-600">Detected — not yet confirmed</p>
          )}
          {(item.priceIncrease || item.isStale) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {item.priceIncrease && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 text-[11px] font-medium text-amber">
                  <TrendingUpIcon className="h-3 w-3" />
                  Price rose €{Math.abs(item.priceIncrease.oldAmount).toFixed(2)} → €
                  {Math.abs(item.priceIncrease.newAmount).toFixed(2)} on {formatDate(item.priceIncrease.changedAt)}
                </span>
              )}
              {item.isStale && (
                <span className="inline-flex items-center rounded-full bg-coral/15 px-2 py-0.5 text-[11px] font-medium text-coral">
                  Hasn&apos;t charged since {formatDate(item.lastChargedAt)} — cancelled?
                </span>
              )}
            </div>
          )}
        </td>
        <td className="truncate px-3 py-3 text-right align-middle text-[13.5px] font-semibold tabular-nums text-foreground">
          {formatAmount(item.typicalAmount)}
        </td>
        <td className="truncate px-3 py-3 align-middle text-[13px] text-muted">{formatInterval(item.intervalDays)}</td>
        <td className="truncate px-3 py-3 align-middle">
          <CategoryBadge category={category} />
        </td>
        <td className="truncate px-3 py-3 align-middle text-[13px] text-muted">{formatDate(item.lastChargedAt)}</td>
        <td className="truncate px-3 py-3 align-middle text-[13px] text-muted">
          {item.isStale ? <span className="text-muted-2">—</span> : formatDate(item.nextExpectedAt)}
        </td>
        <td className="px-3 py-3 align-middle text-right">
          <div className="flex items-center justify-end gap-2">
            {item.status === "detected" ? (
              <>
                <Button
                  variant="secondary"
                  type="button"
                  className="h-7 px-2.5 text-[12px]"
                  disabled={working}
                  onClick={handleDismiss}
                >
                  Not recurring
                </Button>
                <Button type="button" className="h-7 px-2.5 text-[12px]" disabled={working} onClick={handleConfirm}>
                  Confirm
                </Button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleDismiss}
                disabled={working}
                className="text-[12px] font-medium text-muted-2 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 disabled:opacity-50"
              >
                Not recurring
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-canvas last:border-0">
          <td />
          <td colSpan={7} className="px-3 py-3">
            <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-2 uppercase">
              {item.occurrences.length} transaction{item.occurrences.length === 1 ? "" : "s"} · {accountName}
            </p>
            <div className="flex flex-col gap-1">
              {[...item.occurrences]
                .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                .map((occ) => (
                  <div key={occ.id} className="flex items-center justify-between rounded-lg px-2 py-1 text-[12.5px]">
                    <span className="text-foreground">{formatDate(occ.occurredAt)}</span>
                    <span className="flex items-center gap-2">
                      {occ.isOutlier && (
                        <span className="rounded-full bg-amber/15 px-1.5 py-0.5 text-[10px] font-medium text-amber">
                          unusual amount
                        </span>
                      )}
                      <span className="font-medium tabular-nums text-foreground">{formatAmount(occ.amount)}</span>
                    </span>
                  </div>
                ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
