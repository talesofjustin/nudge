"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type BookInfo = { id: string; name: string };

// Mirrors CategoryPicker's "remember for this recipient" toggle exactly:
// defaults off, carries over within a session via sessionStorage (a
// separate key from the category one — the two decisions are independent)
// so a bulk-assignment run doesn't need re-toggling on every row.
const REMEMBER_STORAGE_KEY = "nudge-remember-book-toggle";

function getStoredRemember(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(REMEMBER_STORAGE_KEY) === "1";
}

export function BookPicker({
  books,
  value,
  recipient = null,
  onChange,
}: {
  books: BookInfo[];
  value: string | null;
  // Omit (or pass null) outside a per-transaction context (e.g. setting
  // an account's own default book in Settings) — the remember toggle
  // only makes sense when there's a recipient to remember it for.
  recipient?: string | null;
  onChange: (bookId: string | null, remember: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [remember, setRemember] = useState(false);
  const current = books.find((b) => b.id === value) ?? null;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setRemember(getStoredRemember());
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`rounded-md px-1.5 py-0.5 text-[12.5px] transition-colors hover:bg-canvas ${
            current ? "text-foreground" : "text-muted-2 italic"
          }`}
        >
          {current ? current.name : "No book"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        <button
          type="button"
          onClick={() => {
            onChange(null, false);
            setOpen(false);
          }}
          className={`block w-full rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-canvas ${
            !value ? "font-medium text-foreground" : "text-muted"
          }`}
        >
          No book
        </button>
        {books.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              onChange(b.id, remember);
              setOpen(false);
            }}
            className={`block w-full rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-canvas ${
              value === b.id ? "font-medium text-foreground" : "text-muted"
            }`}
          >
            {b.name}
          </button>
        ))}
        {recipient && (
          <label className="mt-1 flex items-center gap-2 border-t border-border px-2 pt-2 text-[12px] text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => {
                setRemember(e.target.checked);
                window.sessionStorage.setItem(REMEMBER_STORAGE_KEY, e.target.checked ? "1" : "0");
              }}
              className="h-3.5 w-3.5 rounded border-border accent-[var(--violet-600)]"
            />
            Remember for {recipient}
          </label>
        )}
      </PopoverContent>
    </Popover>
  );
}
