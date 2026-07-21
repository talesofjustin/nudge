"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { AddBookDialog } from "@/components/settings/add-book-dialog";
import { renameBook, deleteBook, type BookData } from "@/app/(app)/settings/actions";

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
        <Input label="Book name" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
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

export function BooksManager({ books }: { books: BookData[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  function refresh() {
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Books</h2>
          <p className="mt-1 text-[13px] text-muted">
            Books keep separate parts of your finances apart — like personal and business. Each
            account belongs to a book, and you can override any individual transaction. Most
            people only need one.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setDialogOpen(true)}
          className="h-9 shrink-0 px-4 text-[13.5px]"
        >
          New book
        </Button>
      </div>

      {books.length === 0 ? (
        <p className="text-[13px] text-muted-2">No books yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {books.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-4 py-2.5">
              <div className="flex items-center gap-3">
                <RenamePopover
                  name={b.name}
                  onSave={async (name) => {
                    await renameBook(b.id, name);
                    refresh();
                  }}
                />
                <span className="text-[12px] text-muted-2">
                  {b.accountCount} account{b.accountCount === 1 ? "" : "s"}
                </span>
              </div>

              <ConfirmDeleteButton
                confirmMessage="Accounts become unassigned — delete?"
                onConfirm={async () => {
                  await deleteBook(b.id);
                  refresh();
                }}
              />
            </div>
          ))}
        </div>
      )}

      <AddBookDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={refresh} />
    </Card>
  );
}
