"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBook } from "@/app/(app)/settings/actions";
import { dismissBookSuggestion } from "@/app/(app)/transactions/actions";

// Offered in context on the transactions page rather than tucked in a
// menu — the moment is when the user is already looking at a pile of
// transactions from more than one account and might notice a personal/
// business split worth making. One click just creates the second book;
// existing book-assignment UI (now unlocked) handles sorting afterward.
export function ReactiveBookSuggestion() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [creating, setCreating] = useState(false);

  if (dismissed) return null;

  async function handleAccept() {
    setCreating(true);
    await createBook("Business");
    setCreating(false);
    router.refresh();
  }

  async function handleDismiss() {
    setDismissed(true);
    await dismissBookSuggestion();
  }

  return (
    <div className="shadow-soft mb-4 flex items-center justify-between gap-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
      <p className="text-[13px] text-violet-700">
        Some of these look like business expenses. Want to track business separately from personal?
      </p>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={handleAccept}
          disabled={creating}
          className="text-[13px] font-semibold text-violet-700 hover:underline"
        >
          {creating ? "Setting up…" : "Yes, separate them"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[13px] font-medium text-violet-600/70 hover:text-violet-700"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
