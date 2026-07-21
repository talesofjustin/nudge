"use client";

import { Button } from "@/components/ui/button";

// Shared "always do X for this recipient?" prompt — used identically for
// book rules and category rules (same mechanism, two columns). Rendered
// inside a Popover anchored to the picker it followed (see transaction-
// row.tsx), so it floats above the table instead of growing the row or
// pushing anything below it out of place.
export function RecipientRuleOffer({
  message,
  onConfirm,
  onDismiss,
}: {
  message: string;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex w-64 flex-col gap-3">
      <p className="text-[13px] text-foreground">{message}</p>
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" type="button" className="h-8 px-3 text-[12.5px]" onClick={onDismiss}>
          No thanks
        </Button>
        <Button type="button" className="h-8 px-3 text-[12.5px]" onClick={onConfirm}>
          Yes, always
        </Button>
      </div>
    </div>
  );
}
