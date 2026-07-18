"use client";

import { useState } from "react";
import { CategoryPicker } from "@/components/transactions/category-picker";
import { TransferBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import { RecipientCell } from "@/components/transactions/recipient-cell";
import { RefreshIcon } from "@/components/icons/category-icons";
import type { TransactionRowData } from "@/app/(app)/transactions/actions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TransactionRow({
  row,
  accountName,
  spaceName,
  categories,
  onUpdate,
  onToggleTransfer,
  onCreateCategory,
}: {
  row: TransactionRowData;
  accountName: string;
  spaceName: string | null;
  categories: CategoryInfo[];
  onUpdate: (
    id: string,
    updates: { description?: string; categoryId?: string | null; isRecurring?: boolean },
  ) => void;
  onToggleTransfer: (recipient: string, isOwnAccount: boolean) => void;
  onCreateCategory: (name: string, color: string, icon: string) => Promise<CategoryInfo | null>;
}) {
  const [editingDescription, setEditingDescription] = useState(false);
  const [draft, setDraft] = useState(row.description ?? "");
  const [showRaw, setShowRaw] = useState(false);

  function commitDescription() {
    setEditingDescription(false);
    if (draft !== (row.description ?? "")) {
      onUpdate(row.id, { description: draft });
    }
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="whitespace-nowrap px-3 py-3 text-[13px] text-muted">
        {formatDate(row.occurredAt)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[13px] text-foreground">
        {row.recipient ? (
          <RecipientCell
            recipient={row.recipient}
            isTransfer={row.isTransfer}
            onToggle={(next) => onToggleTransfer(row.recipient!, next)}
          />
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-3 text-[13px] text-foreground">
        {editingDescription ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDescription}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitDescription();
              if (e.key === "Escape") {
                setDraft(row.description ?? "");
                setEditingDescription(false);
              }
            }}
            className="w-full min-w-[160px] rounded-lg border border-violet-400 bg-canvas px-2 py-1 text-[13px] text-foreground outline-none focus:shadow-[0_0_0_3px_var(--violet-200)]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingDescription(true)}
            className="min-w-[160px] rounded-lg px-2 py-1 text-left hover:bg-canvas"
          >
            {row.description || <span className="text-muted-2">Add description…</span>}
          </button>
        )}
        {row.rawDescription && (
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="mt-0.5 block px-2 text-[11px] text-muted-2 underline decoration-dotted hover:text-muted"
          >
            {showRaw ? "Hide original" : "View original"}
          </button>
        )}
        {showRaw && row.rawDescription && (
          <p
            className="mt-0.5 max-w-[240px] truncate px-2 text-[11px] text-muted-2"
            title={row.rawDescription}
          >
            {row.rawDescription}
          </p>
        )}
      </td>
      <td
        className={`whitespace-nowrap px-3 py-3 text-right text-[13px] font-semibold tabular-nums ${
          row.amount > 0 ? "text-mint" : "text-foreground"
        }`}
      >
        {row.amount > 0 ? "+" : "-"}€{Math.abs(row.amount).toFixed(2)}
      </td>
      <td className="px-3 py-3">
        {row.isTransfer ? (
          <TransferBadge />
        ) : (
          <CategoryPicker
            categories={categories}
            value={row.categoryId}
            onChange={(categoryId) => onUpdate(row.id, { categoryId })}
            onCreateCategory={onCreateCategory}
          />
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[13px] text-muted">{accountName}</td>
      <td className="whitespace-nowrap px-3 py-3 text-[13px] text-muted">{spaceName || "—"}</td>
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onUpdate(row.id, { isRecurring: !row.isRecurring })}
          aria-pressed={row.isRecurring}
          title="Recurring"
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            row.isRecurring
              ? "bg-ink-solid text-white"
              : "border border-border text-muted-2 hover:text-foreground"
          }`}
        >
          <RefreshIcon className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}
