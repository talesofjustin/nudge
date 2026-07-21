"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { useId, type ReactNode } from "react";
import { CheckIcon, ChevronRightIcon } from "@/components/icons/dashboard-icons";

export function Select({
  label,
  placeholder,
  className = "",
  children,
  ...props
}: SelectPrimitive.SelectProps & {
  label?: string;
  placeholder?: string;
  className?: string;
  children: ReactNode;
}) {
  const labelId = useId();

  const trigger = (
    <SelectPrimitive.Root {...props}>
      <SelectPrimitive.Trigger
        aria-labelledby={label ? labelId : undefined}
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-border bg-canvas px-3 text-[13.5px] text-foreground outline-none transition-[color,background-color,border-color,box-shadow] data-[placeholder]:text-muted-2 data-[state=open]:border-violet-400 data-[state=open]:bg-surface data-[state=open]:shadow-[0_0_0_3px_var(--violet-200)] ${className}`}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronRightIcon className="h-4 w-4 shrink-0 rotate-90 text-muted-2" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="shadow-soft z-50 w-(--radix-select-trigger-width) overflow-hidden rounded-xl border border-border bg-surface"
        >
          {/* Fixed max-height (never taller than 16rem) so long lists scroll
              inside the panel instead of stretching the page — but still
              capped by the actual available space so it never overflows
              past the viewport edge either. */}
          <SelectPrimitive.Viewport className="max-h-[min(16rem,var(--radix-select-content-available-height))] overflow-y-auto p-1">
            {children}
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

export function SelectItem({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return (
    <SelectPrimitive.Item
      value={value}
      className="relative flex h-8 max-w-full cursor-pointer select-none items-center overflow-hidden rounded-lg px-2.5 pr-7 text-[13px] text-foreground outline-none data-[highlighted]:bg-canvas data-[highlighted]:outline-none"
    >
      <SelectPrimitive.ItemText>
        <span className="block truncate">{children}</span>
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
        <CheckIcon className="h-3.5 w-3.5 text-violet-600" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
