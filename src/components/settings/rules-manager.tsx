"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterChip } from "@/components/ui/pill";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { CategoryBadge, TransferBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import type { BookInfo } from "@/components/transactions/book-picker";
import {
  deleteRecipientBookRule,
  deleteRecipientCategoryRule,
  setRecipientBookRule,
  setRecipientCategoryRule,
  resolveTransferFlag,
  unflagKnownRecipient,
  getAllRules,
  type UnifiedRule,
} from "@/app/(app)/transactions/actions";

type RuleKind = "transfer" | "book" | "category";

// Known-recipient (transfer) flags, recipient->book rules, and
// recipient->category rules are all the same underlying concept — a
// durable decision about a counterparty — so they're presented as one
// list with rule type as a property, not three separate sections. The
// tables stay separate server-side; this is purely a presentation join.
export function RulesManager({
  rules: initialRules,
  books,
  categories,
  recipients,
  showBookFeature,
}: {
  rules: UnifiedRule[];
  books: BookInfo[];
  categories: CategoryInfo[];
  recipients: string[];
  showBookFeature: boolean;
}) {
  const [rules, setRules] = useState(initialRules);
  const [adding, setAdding] = useState(false);

  // Progressive disclosure: book rules aren't a concept to show or create
  // once there's only one book, even if a stale row exists from before.
  const visibleRules = rules.filter((r) => r.kind !== "book" || showBookFeature);

  function handleDeleted(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  function handleTargetChanged(id: string, targetId: string) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, targetId } : r)));
  }

  // Re-fetch rather than guess a new row's shape locally — the add form
  // covers three differently-shaped underlying tables, and a rule for a
  // recipient that already has one of this kind silently updates the
  // existing row (upsert) rather than creating a second, which a naive
  // local append would show as a duplicate until the next reload anyway.
  async function handleAdded() {
    setRules(await getAllRules());
    setAdding(false);
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Rules</h2>
          <p className="mt-1 text-[13px] text-muted">
            Durable decisions about a counterparty — whether they&apos;re a transfer, which book they
            belong to, or how they&apos;re categorised. Learned automatically from how you edit
            transactions, or set here directly.
          </p>
        </div>
        {!adding && (
          <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={() => setAdding(true)}>
            + Add rule
          </Button>
        )}
      </div>

      {adding && (
        <AddRuleForm
          books={books}
          categories={categories}
          recipients={recipients}
          showBookFeature={showBookFeature}
          onAdded={handleAdded}
          onCancel={() => setAdding(false)}
        />
      )}

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

function AddRuleForm({
  books,
  categories,
  recipients,
  showBookFeature,
  onAdded,
  onCancel,
}: {
  books: BookInfo[];
  categories: CategoryInfo[];
  recipients: string[];
  showBookFeature: boolean;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [recipient, setRecipient] = useState("");
  const [kind, setKind] = useState<RuleKind>("transfer");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    recipient.trim().length > 0 &&
    (kind === "transfer" || (kind === "category" && categoryId) || (kind === "book" && bookId));

  async function handleSubmit() {
    const name = recipient.trim();
    if (!name) return;
    setSubmitting(true);
    setError(null);

    const result =
      kind === "transfer"
        ? await resolveTransferFlag(name, true)
        : kind === "category" && categoryId
          ? await setRecipientCategoryRule(name, categoryId)
          : kind === "book" && bookId
            ? await setRecipientBookRule(name, bookId)
            : { success: false };

    setSubmitting(false);
    if (!result.success) {
      setError("Could not save this rule.");
      return;
    }
    onAdded();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-canvas p-3">
      <Input
        label="Recipient"
        list="rule-recipient-options"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="Type or pick a recipient"
        autoFocus
      />
      <datalist id="rule-recipient-options">
        {recipients.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted">Rule type</span>
        <div className="flex gap-2">
          <FilterChip active={kind === "transfer"} onClick={() => setKind("transfer")}>
            Transfer
          </FilterChip>
          <FilterChip active={kind === "category"} onClick={() => setKind("category")}>
            Category
          </FilterChip>
          {showBookFeature && (
            <FilterChip active={kind === "book"} onClick={() => setKind("book")}>
              Book
            </FilterChip>
          )}
        </div>
      </div>

      {kind === "category" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Category</span>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`rounded-full transition-shadow ${
                  categoryId === c.id ? "ring-2 ring-violet-400 ring-offset-1 ring-offset-canvas" : ""
                }`}
              >
                <CategoryBadge category={c} />
              </button>
            ))}
          </div>
        </div>
      )}

      {kind === "book" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Book</span>
          <div className="flex flex-wrap gap-1.5">
            {books.map((b) => (
              <FilterChip key={b.id} active={bookId === b.id} onClick={() => setBookId(b.id)}>
                {b.name}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? "Adding…" : "Add rule"}
        </Button>
      </div>
    </div>
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
  async function handleDelete() {
    if (rule.kind === "transfer") await unflagKnownRecipient(rule.recipient, rule.counterpartyIban);
    else if (rule.kind === "book") await deleteRecipientBookRule(rule.recipient, rule.counterpartyIban);
    else await deleteRecipientCategoryRule(rule.recipient, rule.counterpartyIban);
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

        <ConfirmDeleteButton onConfirm={handleDelete} />
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
