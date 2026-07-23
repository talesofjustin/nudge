"use client";

import { Fragment, useState } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { CategoryPicker } from "@/components/transactions/category-picker";
import { BookPicker, type BookInfo } from "@/components/transactions/book-picker";
import { RecipientRuleOffer } from "@/components/transactions/recipient-rule-offer";
import { type CategoryInfo } from "@/components/transactions/category-badge";
import { RefreshIcon } from "@/components/icons/category-icons";
import { ChevronRightIcon, TransferIcon, TrashIcon } from "@/components/icons/dashboard-icons";
import { parseRawDescription } from "@/lib/parse-raw-description";
import type { TransactionRowData } from "@/app/(app)/transactions/actions";

// Must match the actual number of <th>/<td> cells rendered per row in
// transactions-view.tsx's getColumns() (checkbox + Date + Recipient + Note
// + Amount + Category + [Book] + Account + Recurring). A mismatch here
// makes the expanded detail row's colSpan claim more or fewer columns than
// the table-fixed colgroup actually defines, which visibly reflows/jumps
// the whole table instead of expanding cleanly in place.
export const COLUMN_COUNT_WITH_BOOK = 9;
export const COLUMN_COUNT_WITHOUT_BOOK = 8;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function RawDescriptionDetails({ raw, counterpartyIban }: { raw: string; counterpartyIban: string | null }) {
  const parsed = parseRawDescription(raw);
  const showIbanSeparately = counterpartyIban && !parsed?.some((f) => f.label.toLowerCase() === "iban");

  if (parsed) {
    return (
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[12.5px]">
        {showIbanSeparately && (
          <Fragment>
            <dt className="text-muted-2">Counterparty account</dt>
            <dd className="break-words text-foreground">{counterpartyIban}</dd>
          </Fragment>
        )}
        {parsed.map((f) => (
          <Fragment key={f.label}>
            <dt className="text-muted-2">{f.label}</dt>
            <dd className="break-words text-foreground">{f.value}</dd>
          </Fragment>
        ))}
      </dl>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {counterpartyIban && (
        <p className="text-[12.5px] text-muted-2">
          Counterparty account: <span className="text-foreground">{counterpartyIban}</span>
        </p>
      )}
      <p className="whitespace-pre-wrap break-words text-[12.5px] text-foreground">{raw}</p>
    </div>
  );
}

type PendingOffer = { kind: "book-create"; targetId: string; label: string };

export function TransactionRow({
  row,
  accountName,
  books,
  categories,
  showBookColumn,
  selected,
  bookRuleTargetId,
  onToggleSelect,
  onUpdate,
  onDelete,
  onFilterByRecipient,
  onCreateCategory,
  onUpdateCategory,
  onOfferBookRule,
  onOfferCategoryRule,
}: {
  row: TransactionRowData;
  accountName: string;
  books: BookInfo[];
  categories: CategoryInfo[];
  showBookColumn: boolean;
  selected: boolean;
  bookRuleTargetId: string | null;
  onToggleSelect: (id: string) => void;
  onUpdate: (
    id: string,
    updates: {
      description?: string;
      categoryId?: string | null;
      categorySource?: "manual" | "auto" | null;
      reviewedAt?: string | null;
      isRecurring?: boolean;
      bookId?: string | null;
    },
  ) => void;
  onDelete: (id: string) => void;
  onFilterByRecipient: (recipient: string) => void;
  onCreateCategory: (
    name: string,
    color: string,
    icon: string,
    kind: "spending" | "saving",
  ) => Promise<CategoryInfo | null>;
  onUpdateCategory: (
    id: string,
    updates: { name: string; color: string; icon: string; kind: "spending" | "saving" },
  ) => Promise<void>;
  onOfferBookRule: (recipient: string, bookId: string) => void;
  onOfferCategoryRule: (recipient: string, categoryId: string) => void;
}) {
  const [editingDescription, setEditingDescription] = useState(false);
  const [draft, setDraft] = useState(row.description ?? "");
  const [expanded, setExpanded] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);

  // The picker this follows (BookPicker/CategoryPicker) closes its own
  // popover in the same click that triggers this. Setting pendingOffer
  // (which opens a second popover anchored to the same trigger) in that
  // same tick loses a race against Radix's dismissable-layer handling for
  // the one that's closing, and the new popover closes before it ever
  // paints. A short delay lets that settle first.
  const OFFER_POPOVER_DELAY_MS = 80;

  function commitDescription() {
    setEditingDescription(false);
    if (draft !== (row.description ?? "")) {
      onUpdate(row.id, { description: draft });
    }
  }

  function handleBookChange(bookId: string | null) {
    onUpdate(row.id, { bookId });
    if (bookId && row.recipient && bookRuleTargetId === null) {
      const book = books.find((b) => b.id === bookId);
      if (book) {
        setTimeout(
          () => setPendingOffer({ kind: "book-create", targetId: bookId, label: book.name }),
          OFFER_POPOVER_DELAY_MS,
        );
      }
    } else {
      setPendingOffer(null);
    }
  }

  // Opening the picker and choosing any value — including the same one —
  // is the review: reviewed_at always gets set. Source only flips to
  // "manual" when the value actually changes; re-confirming an auto value
  // leaves it "auto" (now reviewed, so the dashed state clears but it's
  // still an auto category for anyone looking at where it came from).
  // The "remember for this recipient" decision now happens inside the
  // picker itself (a toggle alongside the category list) rather than as a
  // follow-up popup, so it applies in the same gesture as picking.
  function handleCategoryChange(categoryId: string | null, remember: boolean) {
    const changed = categoryId !== row.categoryId;
    onUpdate(row.id, {
      categoryId,
      reviewedAt: new Date().toISOString(),
      ...(changed && { categorySource: "manual" as const }),
    });

    if (categoryId && row.recipient && remember) {
      onOfferCategoryRule(row.recipient, categoryId);
    }
  }

  function confirmOffer() {
    if (!pendingOffer || !row.recipient) return;
    onOfferBookRule(row.recipient, pendingOffer.targetId);
    setPendingOffer(null);
  }

  function offerMessage(offer: PendingOffer): string {
    return `Always put ${row.recipient} in ${offer.label}?`;
  }

  const columnCount = showBookColumn ? COLUMN_COUNT_WITH_BOOK : COLUMN_COUNT_WITHOUT_BOOK;
  const isUnreviewedAuto = row.categorySource === "auto" && !row.reviewedAt;

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
          </div>
        </td>
        <td className="truncate px-3 text-right align-middle text-[13px] font-semibold tabular-nums">
          <span className="inline-flex items-center gap-1">
            {row.isTransfer && (
              <span title="Transfer between your own accounts — not counted as income or expense.">
                <TransferIcon className="h-3 w-3 shrink-0 text-violet-600" aria-label="Transfer" />
              </span>
            )}
            <span className={row.amount > 0 ? "text-mint" : "text-foreground"}>
              {row.amount > 0 ? "+" : "-"}€{Math.abs(row.amount).toFixed(2)}
            </span>
          </span>
        </td>
        <td className="truncate px-3 align-middle">
          {row.isTransfer ? (
            <span
              className="text-[13px] text-muted-2"
              title="Transfers aren't income or expense, so they can't be categorised. Remove this recipient from your own accounts to categorise it."
            >
              —
            </span>
          ) : (
            <CategoryPicker
              categories={categories}
              value={row.categoryId}
              recipient={row.recipient}
              onChange={handleCategoryChange}
              onCreateCategory={onCreateCategory}
              onUpdateCategory={onUpdateCategory}
              unreviewed={isUnreviewedAuto}
            />
          )}
        </td>
        {showBookColumn && (
          <td className="truncate px-3 align-middle">
            <Popover
              open={pendingOffer?.kind === "book-create"}
              onOpenChange={(next) => {
                if (!next) setPendingOffer(null);
              }}
            >
              <PopoverAnchor asChild>
                <div>
                  <BookPicker books={books} value={row.bookId} onChange={handleBookChange} />
                </div>
              </PopoverAnchor>
              {pendingOffer?.kind === "book-create" && (
                <PopoverContent align="start">
                  <RecipientRuleOffer
                    message={offerMessage(pendingOffer)}
                    onConfirm={confirmOffer}
                    onDismiss={() => setPendingOffer(null)}
                  />
                </PopoverContent>
              )}
            </Popover>
          </td>
        )}
        <td className="truncate px-3 align-middle text-[13px] text-muted">{accountName}</td>
        <td className="px-3 text-center align-middle">
          <button
            type="button"
            onClick={() => onUpdate(row.id, { isRecurring: !row.isRecurring })}
            aria-pressed={row.isRecurring}
            title={
              row.isRecurringOutlier && row.recurringTypicalAmount !== null
                ? `Recurring, but unusual amount — typically €${Math.abs(row.recurringTypicalAmount).toFixed(2)}`
                : "Recurring"
            }
            className={`inline-flex items-center justify-center transition-opacity ${
              row.isRecurring
                ? row.isRecurringOutlier
                  ? "text-amber opacity-100"
                  : "text-violet-600 opacity-100"
                : "text-muted-2 opacity-40 hover:opacity-70"
            }`}
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-canvas last:border-0">
          <td />
          <td colSpan={columnCount - 1} className="px-3 py-3">
            <div className="flex flex-col gap-3">
              {row.rawDescription ? (
                <RawDescriptionDetails raw={row.rawDescription} counterpartyIban={row.counterpartyIban} />
              ) : (
                row.counterpartyIban && (
                  <p className="text-[12.5px] text-muted-2">
                    Counterparty account: <span className="text-foreground">{row.counterpartyIban}</span>
                  </p>
                )
              )}

              <div className="flex items-center gap-2 border-t border-border pt-2">
                <ConfirmDeleteButton
                  icon={<TrashIcon className="h-3.5 w-3.5" />}
                  showLabelWithIcon
                  label="Delete transaction"
                  confirmMessage="Delete this transaction permanently?"
                  onConfirm={() => onDelete(row.id)}
                />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
