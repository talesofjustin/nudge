"use client";

import { Fragment, useState } from "react";
import { CategoryPicker } from "@/components/transactions/category-picker";
import { BookPicker, type BookInfo } from "@/components/transactions/book-picker";
import { RecipientRuleOffer } from "@/components/transactions/recipient-rule-offer";
import { type CategoryInfo } from "@/components/transactions/category-badge";
import { RefreshIcon } from "@/components/icons/category-icons";
import { ChevronRightIcon, TransferIcon } from "@/components/icons/dashboard-icons";
import { parseRawDescription } from "@/lib/parse-raw-description";
import type { TransactionRowData } from "@/app/(app)/transactions/actions";

export const COLUMN_COUNT_WITH_BOOK = 10;
export const COLUMN_COUNT_WITHOUT_BOOK = 9;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
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

type PendingOffer = { kind: "book"; targetId: string; label: string } | { kind: "category"; targetId: string; label: string };

export function TransactionRow({
  row,
  accountName,
  books,
  categories,
  showBookColumn,
  selected,
  hasBookRule,
  hasCategoryRule,
  onToggleSelect,
  onUpdate,
  onFilterByRecipient,
  onCreateCategory,
  onOfferBookRule,
  onOfferCategoryRule,
}: {
  row: TransactionRowData;
  accountName: string;
  books: BookInfo[];
  categories: CategoryInfo[];
  showBookColumn: boolean;
  selected: boolean;
  hasBookRule: boolean;
  hasCategoryRule: boolean;
  onToggleSelect: (id: string) => void;
  onUpdate: (
    id: string,
    updates: { description?: string; categoryId?: string | null; isRecurring?: boolean; bookId?: string | null },
  ) => void;
  onFilterByRecipient: (recipient: string) => void;
  onCreateCategory: (name: string, color: string, icon: string) => Promise<CategoryInfo | null>;
  onOfferBookRule: (recipient: string, bookId: string) => void;
  onOfferCategoryRule: (recipient: string, categoryId: string) => void;
}) {
  const [editingDescription, setEditingDescription] = useState(false);
  const [draft, setDraft] = useState(row.description ?? "");
  const [expanded, setExpanded] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);

  function commitDescription() {
    setEditingDescription(false);
    if (draft !== (row.description ?? "")) {
      onUpdate(row.id, { description: draft });
    }
  }

  function handleBookChange(bookId: string | null) {
    onUpdate(row.id, { bookId });
    if (bookId && row.recipient && !hasBookRule) {
      const book = books.find((b) => b.id === bookId);
      if (book) setPendingOffer({ kind: "book", targetId: bookId, label: book.name });
    } else {
      setPendingOffer(null);
    }
  }

  function handleCategoryChange(categoryId: string | null) {
    onUpdate(row.id, { categoryId });
    if (categoryId && row.recipient && !hasCategoryRule) {
      const category = categories.find((c) => c.id === categoryId);
      if (category) setPendingOffer({ kind: "category", targetId: categoryId, label: category.name });
    } else {
      setPendingOffer(null);
    }
  }

  function confirmOffer() {
    if (!pendingOffer || !row.recipient) return;
    if (pendingOffer.kind === "book") onOfferBookRule(row.recipient, pendingOffer.targetId);
    else onOfferCategoryRule(row.recipient, pendingOffer.targetId);
    setPendingOffer(null);
  }

  const columnCount = showBookColumn ? COLUMN_COUNT_WITH_BOOK : COLUMN_COUNT_WITHOUT_BOOK;

  return (
    <>
      <tr className="group h-[52px] border-b border-border last:border-0 hover:bg-canvas">
        <td className="px-3 text-center align-middle">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(row.id)}
            className="h-3.5 w-3.5 rounded border-border accent-[var(--violet-600)]"
            aria-label="Select transaction"
          />
        </td>
        <td className="truncate px-3 align-middle text-[13px] text-muted">
          {formatDate(row.occurredAt)}
        </td>
        <td className="truncate px-3 align-middle text-[13px] font-medium text-foreground">
          {row.recipient ? (
            <button
              type="button"
              onClick={() => onFilterByRecipient(row.recipient!)}
              className="max-w-full truncate rounded-lg px-1 py-1 text-left hover:underline"
              title={`Filter by ${row.recipient}`}
            >
              {row.recipient}
            </button>
          ) : (
            <span className="text-muted-2">—</span>
          )}
        </td>
        <td className="px-3 align-middle text-[13px]">
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
                className="w-full min-w-0 rounded-lg border border-violet-400 bg-canvas px-2 py-1 text-[13px] text-foreground outline-none focus:shadow-[0_0_0_3px_var(--violet-200)]"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingDescription(true)}
                className="min-w-0 flex-1 truncate rounded-lg px-2 py-1 text-left transition-colors hover:bg-surface hover:ring-1 hover:ring-border"
              >
                {row.description ? (
                  <span className="text-foreground">{row.description}</span>
                ) : (
                  <span className="text-muted-2 opacity-50">Add a note…</span>
                )}
              </button>
            )}
            {row.rawDescription && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                title="Show details"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-2 opacity-0 transition-colors group-hover:opacity-100 hover:bg-canvas hover:text-foreground ${
                  expanded ? "rotate-90 opacity-100" : ""
                }`}
              >
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </td>
        <td className="truncate px-3 text-right align-middle text-[13px] font-semibold tabular-nums">
          <span className="inline-flex items-center gap-1">
            {row.isTransfer && (
              <TransferIcon
                className="h-3 w-3 shrink-0 text-violet-600"
                aria-label="Transfer"
              />
            )}
            <span className={row.amount > 0 ? "text-mint" : "text-foreground"}>
              {row.amount > 0 ? "+" : "-"}€{Math.abs(row.amount).toFixed(2)}
            </span>
          </span>
        </td>
        <td className="truncate px-3 align-middle">
          <div className="flex flex-col gap-0.5">
            <CategoryPicker
              categories={categories}
              value={row.categoryId}
              onChange={handleCategoryChange}
              onCreateCategory={onCreateCategory}
            />
            {pendingOffer?.kind === "category" && (
              <RecipientRuleOffer
                message={`Always ${row.recipient} → ${pendingOffer.label}?`}
                onConfirm={confirmOffer}
                onDismiss={() => setPendingOffer(null)}
              />
            )}
          </div>
        </td>
        {showBookColumn && (
          <td className="truncate px-3 align-middle">
            <div className="flex flex-col gap-0.5">
              <BookPicker books={books} value={row.bookId} onChange={handleBookChange} />
              {pendingOffer?.kind === "book" && (
                <RecipientRuleOffer
                  message={`Always ${row.recipient} → ${pendingOffer.label}?`}
                  onConfirm={confirmOffer}
                  onDismiss={() => setPendingOffer(null)}
                />
              )}
            </div>
          </td>
        )}
        <td className="truncate px-3 align-middle text-[13px] text-muted">{accountName}</td>
        <td className="px-3 text-center align-middle">
          <button
            type="button"
            onClick={() => onUpdate(row.id, { isRecurring: !row.isRecurring })}
            aria-pressed={row.isRecurring}
            title="Recurring"
            className={`inline-flex items-center justify-center transition-opacity ${
              row.isRecurring ? "text-violet-600 opacity-100" : "text-muted-2 opacity-40 hover:opacity-70"
            }`}
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        </td>
      </tr>
      {expanded && row.rawDescription && (
        <tr className="border-b border-border bg-canvas last:border-0">
          <td />
          <td colSpan={columnCount - 1} className="px-3 py-3">
            <RawDescriptionDetails raw={row.rawDescription} />
          </td>
        </tr>
      )}
    </>
  );
}
