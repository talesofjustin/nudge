"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryPicker } from "@/components/transactions/category-picker";
import { BookPicker, type BookInfo } from "@/components/transactions/book-picker";
import { TrashIcon } from "@/components/icons/dashboard-icons";
import { sanitizeAmountInput } from "@/lib/sanitize-amount";
import {
  saveTransactionSplits,
  type SplitInput,
  type TransactionSplitData,
} from "@/app/(app)/transactions/split-actions";
import type { CategoryInfo } from "@/components/transactions/category-badge";
import type { CategoryKind } from "@/lib/supabase/database.types";

type DraftLine = { key: string; categoryId: string | null; bookId: string | null; amount: string; note: string };

let draftKeyCounter = 0;
function nextDraftKey(): string {
  draftKeyCounter += 1;
  return `draft-${draftKeyCounter}`;
}

function linesFromSplits(splits: TransactionSplitData[]): DraftLine[] {
  return splits.map((s) => ({
    key: s.id,
    categoryId: s.categoryId,
    bookId: s.bookId,
    amount: Math.abs(s.amount).toFixed(2),
    note: s.note ?? "",
  }));
}

// Inline editor rendered inside a transaction's expanded row — never a
// modal or a separate page. Amounts are entered as plain positive
// numbers ("how much of this charge"); the parent transaction's sign is
// applied once on save so a split of a €100 expense produces two €-sign
// expense parts, not a mix of signs.
export function TransactionSplitEditor({
  transactionId,
  parentAmount,
  parentCategoryId,
  parentNote,
  initialSplits,
  categories,
  books,
  showBookColumn,
  onCreateCategory,
  onUpdateCategory,
  onSaved,
  onUnsplit,
}: {
  transactionId: string;
  parentAmount: number;
  parentCategoryId: string | null;
  parentNote: string | null;
  initialSplits: TransactionSplitData[];
  categories: CategoryInfo[];
  books: BookInfo[];
  showBookColumn: boolean;
  onCreateCategory: (name: string, color: string, icon: string, kind: CategoryKind) => Promise<CategoryInfo | null>;
  onUpdateCategory: (
    id: string,
    updates: { name: string; color: string; icon: string; kind: CategoryKind },
  ) => Promise<void>;
  onSaved: (splits: TransactionSplitData[]) => void;
  onUnsplit: () => void;
}) {
  const isSplit = initialSplits.length > 0;
  // Starting a fresh split pre-fills one line with the transaction's
  // current amount/category/note — the natural starting point before the
  // user carves off a second part, matching "one line to start".
  const [lines, setLines] = useState<DraftLine[]>(() =>
    isSplit
      ? linesFromSplits(initialSplits)
      : [
          {
            key: nextDraftKey(),
            categoryId: parentCategoryId,
            bookId: null,
            amount: Math.abs(parentAmount).toFixed(2),
            note: parentNote ?? "",
          },
        ],
  );
  const [saving, setSaving] = useState(false);
  const [unsplitting, setUnsplitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const targetAbs = Math.abs(parentAmount);
  const remaining = Math.round((targetAbs - total) * 100) / 100;
  const balanced = Math.abs(remaining) < 0.005;

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        key: nextDraftKey(),
        categoryId: null,
        bookId: null,
        amount: remaining > 0 ? remaining.toFixed(2) : "",
        note: "",
      },
    ]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  async function handleSave() {
    if (!balanced || saving) return;
    setSaving(true);
    setError(null);
    const sign = parentAmount < 0 ? -1 : 1;
    const payload: SplitInput[] = lines.map((l) => ({
      categoryId: l.categoryId,
      bookId: l.bookId,
      amount: sign * Math.abs(Number(l.amount) || 0),
      note: l.note.trim() || null,
    }));
    const res = await saveTransactionSplits(transactionId, payload);
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    onSaved(res.splits);
  }

  async function handleUnsplit() {
    setUnsplitting(true);
    const res = await saveTransactionSplits(transactionId, []);
    setUnsplitting(false);
    if (res.success) onUnsplit();
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[12.5px] font-semibold text-foreground">Split into parts</h4>
        {isSplit && (
          <button
            type="button"
            onClick={handleUnsplit}
            disabled={unsplitting}
            className="text-[12px] font-medium text-muted-2 hover:text-danger disabled:opacity-50"
          >
            {unsplitting ? "Un-splitting…" : "Un-split"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {lines.map((line) => (
          <div key={line.key} className="flex items-center gap-2">
            <Input
              value={line.amount}
              onChange={(e) => updateLine(line.key, { amount: sanitizeAmountInput(e.target.value) })}
              prefix="€"
              inputMode="decimal"
              placeholder="0.00"
              className="w-24 shrink-0"
            />
            <CategoryPicker
              categories={categories}
              value={line.categoryId}
              recipient={null}
              onChange={(categoryId) => updateLine(line.key, { categoryId })}
              onCreateCategory={onCreateCategory}
              onUpdateCategory={onUpdateCategory}
            />
            {showBookColumn && (
              <BookPicker books={books} value={line.bookId} onChange={(bookId) => updateLine(line.key, { bookId })} />
            )}
            <input
              value={line.note}
              onChange={(e) => updateLine(line.key, { note: e.target.value })}
              placeholder="Note (optional)"
              className="min-w-0 flex-1 rounded-lg border border-border bg-canvas px-2 py-1.5 text-[12.5px] text-foreground outline-none focus:border-violet-400"
            />
            <button
              type="button"
              onClick={() => removeLine(line.key)}
              disabled={lines.length === 1}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-2 transition-colors hover:bg-canvas hover:text-danger disabled:opacity-30"
              aria-label="Remove part"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addLine} className="self-start text-[12.5px] font-medium text-violet-600 hover:underline">
        + Add another part
      </button>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
        {balanced ? (
          <p className="text-[12.5px] font-medium text-mint">€{targetAbs.toFixed(2)} allocated — fully split</p>
        ) : (
          <p className="text-[12.5px] font-medium text-muted">
            €{total.toFixed(2)} allocated, €{Math.abs(remaining).toFixed(2)} {remaining > 0 ? "remaining" : "over"}
          </p>
        )}
        {error && (
          <p className="text-[12px] text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="button" size="sm" disabled={!balanced || saving} onClick={handleSave} className="ml-auto">
          {saving ? "Saving…" : "Save split"}
        </Button>
      </div>
    </div>
  );
}
