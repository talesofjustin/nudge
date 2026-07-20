"use client";

import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type RuleTarget = { id: string; render: ReactNode };

export type RuleRow = {
  recipient: string;
  targetId: string;
};

// Shared by both recipient→book and recipient→category rules — same
// mechanism, same UI, just a different set of targets passed in.
function TargetPicker({
  targets,
  value,
  onChange,
}: {
  targets: RuleTarget[];
  value: string;
  onChange: (targetId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = targets.find((t) => t.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="rounded-md transition-opacity hover:opacity-80">
          {current?.render ?? <span className="text-[13px] text-muted-2 italic">Unknown</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        {targets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              onChange(t.id);
              setOpen(false);
            }}
            className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-canvas"
          >
            {t.render}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function RuleList({
  rows,
  targets,
  emptyMessage,
  onChangeTarget,
  onDelete,
}: {
  rows: RuleRow[];
  targets: RuleTarget[];
  emptyMessage: string;
  onChangeTarget: (recipient: string, targetId: string) => void;
  onDelete: (recipient: string) => void;
}) {
  const [confirmingRecipient, setConfirmingRecipient] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="text-[13px] text-muted-2">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {rows.map((row) => (
        <div key={row.recipient} className="flex items-center justify-between gap-4 py-2.5">
          <span className="min-w-0 truncate text-[13.5px] text-foreground">{row.recipient}</span>
          <div className="flex shrink-0 items-center gap-3">
            <TargetPicker
              targets={targets}
              value={row.targetId}
              onChange={(targetId) => onChangeTarget(row.recipient, targetId)}
            />
            {confirmingRecipient === row.recipient ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingRecipient(null)}
                  className="text-[12px] font-medium text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(row.recipient);
                    setConfirmingRecipient(null);
                  }}
                  className="text-[12px] font-medium text-danger hover:underline"
                >
                  Confirm
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingRecipient(row.recipient)}
                className="text-[12px] font-medium text-muted-2 hover:text-danger"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
