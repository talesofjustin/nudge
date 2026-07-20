"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookPicker, type BookInfo } from "@/components/transactions/book-picker";
import { AddAccountDialog } from "@/components/settings/add-account-dialog";
import {
  updateAccount,
  deleteAccount,
  resetColumnMapping,
  type AccountData,
} from "@/app/(app)/settings/actions";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: "Bank",
  paypal: "PayPal",
  credit_card: "Credit card",
  cash: "Cash",
  other: "Other",
};

function RenamePopover({ name, onSave }: { name: string; onSave: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValue(name);
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className="text-left text-[13.5px] font-medium text-foreground hover:underline">
          {name}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start">
        <Input
          label="Account name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <Button
          type="button"
          className="mt-3 h-8 w-full text-[13px]"
          onClick={() => {
            if (value.trim()) onSave(value.trim());
            setOpen(false);
          }}
        >
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function AccountRow({
  account,
  books,
  showBookFeature,
  onChanged,
}: {
  account: AccountData;
  books: BookInfo[];
  showBookFeature: boolean;
  onChanged: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <RenamePopover
          name={account.name}
          onSave={async (name) => {
            await updateAccount(account.id, { name });
            onChanged();
          }}
        />
        <span className="text-[12px] text-muted-2">
          {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {showBookFeature && (
          <BookPicker
            books={books}
            value={account.defaultBookId}
            onChange={async (bookId) => {
              await updateAccount(account.id, { defaultBookId: bookId });
              onChanged();
            }}
          />
        )}

        {account.hasColumnMapping && (
          <button
            type="button"
            onClick={async () => {
              setResetting(true);
              await resetColumnMapping(account.id);
              setResetting(false);
              setResetDone(true);
              onChanged();
            }}
            className="text-[12.5px] font-medium text-muted hover:text-foreground"
            disabled={resetting}
          >
            {resetDone ? "Mapping reset" : resetting ? "Resetting…" : "Reset column mapping"}
          </button>
        )}

        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted">Delete?</span>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-[12.5px] font-medium text-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                await deleteAccount(account.id);
                onChanged();
              }}
              className="text-[12.5px] font-medium text-danger hover:underline"
            >
              Confirm
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-[12.5px] font-medium text-muted-2 hover:text-danger"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export function AccountsManager({
  accounts,
  books,
}: {
  accounts: AccountData[];
  books: BookInfo[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const showBookFeature = books.length > 1;

  function refresh() {
    router.refresh();
  }

  const grouped = showBookFeature
    ? books
        .map((book) => ({ book, accounts: accounts.filter((a) => a.defaultBookId === book.id) }))
        .concat([{ book: null as unknown as BookInfo, accounts: accounts.filter((a) => !a.defaultBookId) }])
        .filter((g) => g.accounts.length > 0)
    : [{ book: null as unknown as BookInfo, accounts }];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Accounts</h2>
          <p className="mt-1 text-[13px] text-muted">
            Bank accounts, cards, and other places your money lives.
          </p>
        </div>
        <Button type="button" onClick={() => setDialogOpen(true)} className="h-9 px-4 text-[13.5px]">
          Add account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <p className="text-[13px] text-muted-2">No accounts yet — add one to start importing.</p>
      ) : (
        <div className="flex flex-col">
          {grouped.map((group, i) => (
            <div key={group.book?.id ?? "unassigned"} className={i > 0 ? "border-t border-border pt-1" : ""}>
              {showBookFeature && (
                <p className="pt-3 text-[11px] font-medium tracking-wide text-muted-2 uppercase">
                  {group.book?.name ?? "No book"}
                </p>
              )}
              <div className="flex flex-col divide-y divide-border">
                {group.accounts.map((a) => (
                  <AccountRow
                    key={a.id}
                    account={a}
                    books={books}
                    showBookFeature={showBookFeature}
                    onChanged={refresh}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddAccountDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={refresh} />
    </Card>
  );
}
