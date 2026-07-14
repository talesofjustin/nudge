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
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-border bg-canvas px-3.5 text-[15px] text-foreground outline-none transition-[color,background-color,border-color,box-shadow] data-[placeholder]:text-muted-2 data-[state=open]:border-violet-400 data-[state=open]:bg-surface data-[state=open]:shadow-[0_0_0_3px_var(--violet-200)] ${className}`}
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
          className="shadow-soft z-50 max-h-[--radix-select-content-available-height] w-[--radix-select-trigger-width] overflow-hidden rounded-2xl border border-border bg-surface"
        >
          <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
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
      className="relative flex h-9 cursor-pointer select-none items-center rounded-xl px-3 pr-8 text-[14px] text-foreground outline-none data-[highlighted]:bg-canvas data-[highlighted]:outline-none"
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
        <CheckIcon className="h-3.5 w-3.5 text-violet-600" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
