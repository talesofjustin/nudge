"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createBook, renameBook, deleteBook, type BookData } from "@/app/(app)/settings/actions";

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
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setSubmitting(true);
    await createBook(newName.trim());
    setSubmitting(false);
    setNewName("");
    setCreating(false);
    refresh();
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
        {!creating && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCreating(true)}
            className="h-9 shrink-0 px-4 text-[13.5px]"
          >
            New book
          </Button>
        )}
      </div>

      {creating && (
        <div className="flex items-end gap-2">
          <Input
            label="Name"
            placeholder="e.g. Freelance"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            className="max-w-xs"
          />
          <Button type="button" onClick={handleCreate} disabled={submitting} className="h-9 px-4 text-[13px]">
            {submitting ? "Adding…" : "Add"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setCreating(false);
              setNewName("");
            }}
            className="h-9 px-3 text-[13px]"
          >
            Cancel
          </Button>
        </div>
      )}

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

              {confirmingDeleteId === b.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted">Delete — accounts become unassigned?</span>
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteId(null)}
                    className="text-[12.5px] font-medium text-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteBook(b.id);
                      refresh();
                    }}
                    className="text-[12.5px] font-medium text-danger hover:underline"
                  >
                    Confirm
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteId(b.id)}
                  className="text-[12.5px] font-medium text-muted-2 hover:text-danger"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
