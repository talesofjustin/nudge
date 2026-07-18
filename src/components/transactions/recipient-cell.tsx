"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function RecipientCell({
  recipient,
  isTransfer,
  onToggle,
}: {
  recipient: string;
  isTransfer: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-lg px-1.5 py-1 text-left hover:bg-canvas"
        >
          {recipient}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <p className="text-[13px] font-medium text-foreground">{recipient}</p>
        {isTransfer ? (
          <>
            <p className="mt-1 text-[12px] text-muted">
              Flagged as one of your own accounts. Transactions with this recipient are treated
              as transfers, not income or spending.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3 h-8 w-full text-[13px]"
              onClick={() => onToggle(false)}
            >
              Unflag
            </Button>
          </>
        ) : (
          <>
            <p className="mt-1 text-[12px] text-muted">
              Is this one of your own accounts (e.g. a savings goal)? Mark it so transfers
              aren&apos;t counted as income or spending.
            </p>
            <Button
              type="button"
              className="mt-3 h-8 w-full text-[13px]"
              onClick={() => onToggle(true)}
            >
              Mark as own account
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
