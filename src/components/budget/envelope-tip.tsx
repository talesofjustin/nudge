"use client";

import { useState } from "react";
import { dismissBudgetTip } from "@/app/(app)/budget/actions";

export function EnvelopeTip({ initiallyDismissed }: { initiallyDismissed: boolean }) {
  const [dismissed, setDismissed] = useState(initiallyDismissed);

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    void dismissBudgetTip();
  }

  return (
    <div className="tint-violet flex items-start justify-between gap-4 rounded-2xl px-4 py-3">
      <p className="text-[13px] text-foreground">
        <span className="font-medium">Tip:</span> try the envelope method — once you&apos;ve set
        your budgets, move each amount into a savings goal in your bank app, then transfer back to
        your current account as you spend it.
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 text-[12px] font-medium text-muted hover:text-foreground"
      >
        Dismiss
      </button>
    </div>
  );
}
