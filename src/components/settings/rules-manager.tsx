"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CategoryBadge, TransferBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import type { BookInfo } from "@/components/transactions/book-picker";
import {
  deleteRecipientBookRule,
  deleteRecipientCategoryRule,
  setRecipientBookRule,
  setRecipientCategoryRule,
  unflagKnownRecipient,
  type UnifiedRule,
} from "@/app/(app)/transactions/actions";

// Known-recipient (transfer) flags, recipient->book rules, and
// recipient->category rules are all the same underlying concept — a
// durable decision about a counterparty — so they're presented as one
// list with rule type as a property, not three separate sections. The
// tables stay separate server-side; this is purely a presentation join.
export function RulesManager({
  rules: initialRules,
  books,
  categories,
  showBookFeature,
}: {
  rules: UnifiedRule[];
  books: BookInfo[];
  categories: CategoryInfo[];
  showBookFeature: boolean;
}) {
  const [rules, setRules] = useState(initialRules);

  // Progressive disclosure: book rules aren't a concept to show or create
  // once there's only one book, even if a stale row exists from before.
  const visibleRules = rules.filter((r) => r.kind !== "book" || showBookFeature);

  function handleDeleted(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  function handleTargetChanged(id: string, targetId: string) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, targetId } : r)));
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Rules</h2>
        <p className="mt-1 text-[13px] text-muted">
          Durable decisions about a counterparty — whether they&apos;re a transfer, which book they
          belong to, or how they&apos;re categorised. Learned automatically from how you edit
          transactions, or set here directly.
        </p>
      </div>

      {visibleRules.length === 0 ? (
        <p className="text-[13px] text-muted-2">
          No rules yet — these are offered when you flag a transfer, or manually set a book or
          category on a transaction.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {visibleRules.map((rule) => (
            <RuleRow
              key={`${rule.kind}-${rule.id}`}
              rule={rule}
              books={books}
              categories={categories}
              onDeleted={() => handleDeleted(rule.id)}
              onTargetChanged={(targetId) => handleTargetChanged(rule.id, targetId)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function RuleRow({
  rule,
  books,
  categories,
  onDeleted,
  onTargetChanged,
}: {
  rule: UnifiedRule;
  books: BookInfo[];
  categories: CategoryInfo[];
  onDeleted: () => void;
  onTargetChanged: (targetId: string) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    if (rule.kind === "transfer") await unflagKnownRecipient(rule.recipient, rule.counterpartyIban);
    else if (rule.kind === "book") await deleteRecipientBookRule(rule.recipient, rule.counterpartyIban);
    else await deleteRecipientCategoryRule(rule.recipient, rule.counterpartyIban);
    setDeleting(false);
    onDeleted();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-medium text-foreground">{rule.recipient}</p>
        {rule.counterpartyIban && (
          <p className="truncate text-[11px] text-muted-2">{rule.counterpartyIban}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {rule.kind === "transfer" && <TransferBadge />}
        {rule.kind === "book" && (
          <BookTargetPicker
            books={books}
            value={rule.targetId}
            onChange={async (bookId) => {
              onTargetChanged(bookId);
              await setRecipientBookRule(rule.recipient, bookId, rule.counterpartyIban);
            }}
          />
        )}
        {rule.kind === "category" && (
          <CategoryTargetPicker
            categories={categories}
            value={rule.targetId}
            onChange={async (categoryId) => {
              onTargetChanged(categoryId);
              await setRecipientCategoryRule(rule.recipient, categoryId, rule.counterpartyIban);
            }}
          />
        )}

        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-[12px] font-medium text-muted hover:text-foreground"
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="text-[12px] font-medium text-danger hover:underline"
              disabled={deleting}
            >
              {deleting ? "Removing…" : "Confirm"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-[12px] font-medium text-muted-2 hover:text-danger"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function BookTargetPicker({
  books,
  value,
  onChange,
}: {
  books: BookInfo[];
  value: string | null;
  onChange: (bookId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = books.find((b) => b.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="text-[13px] text-foreground hover:underline">
          {current?.name ?? "Unknown book"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="end">
        {books.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              onChange(b.id);
              setOpen(false);
            }}
            className="block w-full rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-canvas"
          >
            {b.name}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function CategoryTargetPicker({
  categories,
  value,
  onChange,
}: {
  categories: CategoryInfo[];
  value: string | null;
  onChange: (categoryId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = categories.find((c) => c.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="rounded-full transition-opacity hover:opacity-80">
          <CategoryBadge category={current} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="end">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              onChange(c.id);
              setOpen(false);
            }}
            className="block w-full rounded-xl px-1 py-1 text-left hover:bg-canvas"
          >
            <CategoryBadge category={c} />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
