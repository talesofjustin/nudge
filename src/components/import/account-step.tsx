"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddAccountDialog } from "@/components/settings/add-account-dialog";
import type { ImportAccountOption } from "@/app/(app)/import/actions";

// Selection only — no inline creation, and no book/space question here.
// The account itself already determines the book (its default, or "mixed"
// if none). The empty state opens the same dialog Settings uses to add an
// account, rather than sending the user away from the import flow.
export function AccountStep({
  accounts,
  selectedId,
  onSelect,
  onAccountAdded,
  onNext,
}: {
  accounts: ImportAccountOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAccountAdded: (accountId: string) => void;
  onNext: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (accounts.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <h2 className="text-[15px] font-semibold text-ink">No accounts yet</h2>
        <p className="max-w-sm text-[13px] text-muted">
          Add an account before importing a statement — it only takes a moment.
        </p>
        <Button type="button" className="mt-2" onClick={() => setDialogOpen(true)}>
          Add an account
        </Button>
        <AddAccountDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onCreated={onAccountAdded}
        />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-6">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Which account is this?</h2>
        <p className="mt-1 text-[13px] text-muted">
          Picking the account first lets us reuse its saved column mapping.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {accounts.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
              selectedId === a.id
                ? "border-violet-400 bg-violet-50"
                : "border-border hover:border-muted-2"
            }`}
          >
            <span className="text-[13.5px] font-medium text-foreground">{a.name}</span>
            {a.columnMapping && (
              <span className="text-[11.5px] text-muted-2">Saved mapping</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => setDialogOpen(true)}>
          Add another account
        </Button>
        <Button type="button" disabled={!selectedId} onClick={onNext}>
          Continue
        </Button>
      </div>

      <AddAccountDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={onAccountAdded} />
    </Card>
  );
}
