"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";

// 200ms, not the browser-native ~600-1000ms default — a hint that's slow
// to appear reads as not there at all. One shared Provider (mounted once
// in the app layout) means every Tooltip in the app inherits this without
// having to repeat it.
export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="shadow-soft z-50 max-w-64 rounded-lg bg-ink-solid px-2.5 py-1.5 text-[12px] font-medium text-white"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-ink-solid" width={10} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
