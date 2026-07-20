"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { RuleList, type RuleTarget } from "@/components/settings/rule-list";
import { CategoryBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import type { BookInfo } from "@/components/transactions/book-picker";
import {
  setRecipientBookRule,
  deleteRecipientBookRule,
  setRecipientCategoryRule,
  deleteRecipientCategoryRule,
  type RecipientBookRule,
  type RecipientCategoryRule,
} from "@/app/(app)/transactions/actions";

export function RulesManager({
  bookRules: initialBookRules,
  categoryRules: initialCategoryRules,
  books,
  categories,
  showBookFeature,
}: {
  bookRules: RecipientBookRule[];
  categoryRules: RecipientCategoryRule[];
  books: BookInfo[];
  categories: CategoryInfo[];
  showBookFeature: boolean;
}) {
  const [bookRules, setBookRules] = useState(initialBookRules);
  const [categoryRules, setCategoryRules] = useState(initialCategoryRules);

  const bookTargets: RuleTarget[] = books.map((b) => ({ id: b.id, render: <span className="text-[13px]">{b.name}</span> }));
  const categoryTargets: RuleTarget[] = categories.map((c) => ({ id: c.id, render: <CategoryBadge category={c} /> }));

  return (
    <Card className="flex flex-col gap-6">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Rules</h2>
        <p className="mt-1 text-[13px] text-muted">
          Recipients that are always sorted the same way, learned from how you&apos;ve categorized
          them before.
        </p>
      </div>

      {showBookFeature && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-foreground">Always this book</h3>
          <RuleList
            rows={bookRules.map((r) => ({ recipient: r.recipient, targetId: r.bookId }))}
            targets={bookTargets}
            emptyMessage="No book rules yet — these are offered when you manually set a book on a transaction."
            onChangeTarget={async (recipient, targetId) => {
              setBookRules((prev) => prev.map((r) => (r.recipient === recipient ? { ...r, bookId: targetId } : r)));
              await setRecipientBookRule(recipient, targetId);
            }}
            onDelete={async (recipient) => {
              setBookRules((prev) => prev.filter((r) => r.recipient !== recipient));
              await deleteRecipientBookRule(recipient);
            }}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-foreground">Always this category</h3>
        <RuleList
          rows={categoryRules.map((r) => ({ recipient: r.recipient, targetId: r.categoryId }))}
          targets={categoryTargets}
          emptyMessage="No category rules yet — these are offered when you manually categorize a transaction."
          onChangeTarget={async (recipient, targetId) => {
            setCategoryRules((prev) =>
              prev.map((r) => (r.recipient === recipient ? { ...r, categoryId: targetId } : r)),
            );
            await setRecipientCategoryRule(recipient, targetId);
          }}
          onDelete={async (recipient) => {
            setCategoryRules((prev) => prev.filter((r) => r.recipient !== recipient));
            await deleteRecipientCategoryRule(recipient);
          }}
        />
      </div>
    </Card>
  );
}
