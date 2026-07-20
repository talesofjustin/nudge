"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type BookInfo = { id: string; name: string };

export function BookPicker({
  books,
  value,
  onChange,
}: {
  books: BookInfo[];
  value: string | null;
  onChange: (bookId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = books.find((b) => b.id === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
            onChange(null);
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
              onChange(b.id);
              setOpen(false);
            }}
            className={`block w-full rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-canvas ${
              value === b.id ? "font-medium text-foreground" : "text-muted"
            }`}
          >
            {b.name}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
