"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent({
  children,
  className = "",
  align = "start",
  sideOffset = 8,
}: {
  children: React.ReactNode;
  className?: string;
  align?: PopoverPrimitive.PopoverContentProps["align"];
  sideOffset?: number;
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={`shadow-soft z-50 rounded-xl border border-border bg-surface p-2.5 outline-none ${className}`}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}
