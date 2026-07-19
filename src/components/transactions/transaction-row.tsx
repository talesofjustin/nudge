"use client";

import { Fragment, useState } from "react";
import { CategoryPicker } from "@/components/transactions/category-picker";
import { TransferBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import { RefreshIcon } from "@/components/icons/category-icons";
import { ChevronRightIcon } from "@/components/icons/dashboard-icons";
import { parseRawDescription } from "@/lib/parse-raw-description";
import type { TransactionRowData } from "@/app/(app)/transactions/actions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RawDescriptionDetails({ raw }: { raw: string }) {
  const parsed = parseRawDescription(raw);
  if (parsed) {
    return (
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[12.5px]">
        {parsed.map((f) => (
          <Fragment key={f.label}>
            <dt className="text-muted-2">{f.label}</dt>
            <dd className="break-words text-foreground">{f.value}</dd>
          </Fragment>
        ))}
      </dl>
    );
  }
  return <p className="whitespace-pre-wrap break-words text-[12.5px] text-foreground">{raw}</p>;
}

export function TransactionRow({
  row,
  accountName,
  spaceName,
  categories,
  selected,
  onToggleSelect,
  onUpdate,
  onFilterByRecipient,
  onCreateCategory,
}: {
  row: TransactionRowData;
  accountName: string;
  spaceName: string | null;
  categories: CategoryInfo[];
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onUpdate: (
    id: string,
    updates: { description?: string; categoryId?: string | null; isRecurring?: boolean },
  ) => void;
  onFilterByRecipient: (recipient: string) => void;
  onCreateCategory: (name: string, color: string, icon: string) => Promise<CategoryInfo | null>;
}) {
  const [editingDescription, setEditingDescription] = useState(false);
  const [draft, setDraft] = useState(row.description ?? "");
  const [expanded, setExpanded] = useState(false);

  function commitDescription() {
    setEditingDescription(false);
    if (draft !== (row.description ?? "")) {
      onUpdate(row.id, { description: draft });
    }
  }

  return (
    <>
      <tr className="h-14 border-b border-border last:border-0">
        <td className="w-10 px-3 py-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(row.id)}
            className="h-4 w-4 rounded border-border accent-[var(--violet-600)]"
            aria-label="Select transaction"
          />
        </td>
        <td className="whitespace-nowrap px-3 py-3 text-[13px] text-muted">
          {formatDate(row.occurredAt)}
        </td>
        <td className="whitespace-nowrap px-3 py-3 text-[13px] text-foreground">
          {row.recipient ? (
            <button
              type="button"
              onClick={() => onFilterByRecipient(row.recipient!)}
              className="rounded-lg px-1.5 py-1 text-left hover:bg-canvas hover:underline"
              title={`Filter by ${row.recipient}`}
            >
              {row.recipient}
            </button>
          ) : (
            "—"
          )}
        </td>
        <td className="px-3 py-3 text-[13px] text-foreground">
          <div className="flex items-center gap-1">
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
                {row.description || <span className="text-muted-2">Add a note…</span>}
              </button>
            )}
            {row.rawDescription && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                title="Show details"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-2 transition-colors hover:bg-canvas hover:text-foreground ${
                  expanded ? "rotate-90" : ""
                }`}
              >
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
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
        <td className="px-3 py-3 text-center">
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
      {expanded && row.rawDescription && (
        <tr className="border-b border-border bg-canvas last:border-0">
          <td />
          <td colSpan={8} className="px-3 py-3">
            <RawDescriptionDetails raw={row.rawDescription} />
          </td>
        </tr>
      )}
    </>
  );
}
