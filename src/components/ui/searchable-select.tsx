"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  CheckIcon,
  ChevronRightIcon,
  SearchIcon,
} from "@/components/icons/dashboard-icons";

export type SearchableSelectOption = { value: string; label: string };

// Radix Select's built-in type-ahead only jumps to the first match; this
// adds an actual filterable search input pinned to the top of the panel,
// for lists too long to browse comfortably (e.g. timezones).
export function SearchableSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder = "Search…",
}: {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const labelId = useId();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [search, options]);

  // Stops Radix's own Content-level keydown handler (arrow-key nav,
  // letter-jump type-ahead) from swallowing keystrokes meant for the input.
  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
  }

  const trigger = (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      onOpenChange={(open) => {
        if (open) {
          // Radix focuses the selected item on open (for keyboard nav) —
          // there's no onOpenAutoFocus escape hatch on Select.Content like
          // there is on Dialog/Popover, so win the focus race with a
          // deferred call instead, after Radix's own mount-time focus runs.
          setTimeout(() => inputRef.current?.focus(), 0);
        } else {
          setSearch("");
        }
      }}
    >
      <SelectPrimitive.Trigger
        aria-labelledby={label ? labelId : undefined}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-border bg-canvas px-3.5 text-[15px] text-foreground outline-none transition-[color,background-color,border-color,box-shadow] data-[placeholder]:text-muted-2 data-[state=open]:border-violet-400 data-[state=open]:bg-surface data-[state=open]:shadow-[0_0_0_3px_var(--violet-200)]"
      >
        {/* Explicit children (not Radix's default item-text tracking) so the
            trigger label stays correct even when the selected option is
            currently filtered out of the visible list. */}
        <SelectPrimitive.Value placeholder={placeholder}>
          {options.find((o) => o.value === value)?.label ?? value}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon>
          <ChevronRightIcon className="h-4 w-4 shrink-0 rotate-90 text-muted-2" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="shadow-soft z-50 w-(--radix-select-trigger-width) overflow-hidden rounded-2xl border border-border bg-surface"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <SearchIcon className="h-4 w-4 shrink-0 text-muted-2" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-2"
            />
          </div>

          <SelectPrimitive.Viewport className="max-h-[min(18rem,var(--radix-select-content-available-height))] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-[13px] text-muted">No matches</p>
            ) : (
              filtered.map((o) => (
                <SelectPrimitive.Item
                  key={o.value}
                  value={o.value}
                  className="relative flex h-9 cursor-pointer select-none items-center rounded-xl px-3 pr-8 text-[14px] text-foreground outline-none data-[highlighted]:bg-canvas data-[highlighted]:outline-none"
                >
                  <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
                    <CheckIcon className="h-3.5 w-3.5 text-violet-600" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))
            )}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );

  if (!label) return trigger;

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-[13px] font-medium text-muted">
        {label}
      </span>
      {trigger}
    </div>
  );
}
