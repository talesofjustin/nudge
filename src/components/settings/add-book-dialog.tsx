"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createBook } from "@/app/(app)/settings/actions";

export function AddBookDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (bookId: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Give the book a name.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const res = await createBook(name.trim());
    setSubmitting(false);

    if (!res.success || !res.id) {
      setError("Could not create book.");
      return;
    }

    router.refresh();
    onCreated?.(res.id);
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <h2 className="text-[16px] font-semibold text-ink">Add book</h2>
      <p className="mt-2 text-[13px] text-muted">
        A book keeps one part of your finances separate from another — like personal and
        business, or your money and a partner&apos;s. Each account belongs to a book, and any
        transaction can be moved to a different one on its own.
      </p>
      <p className="mt-2 text-[13px] text-muted">
        For example: someone freelancing alongside a day job might have a{" "}
        <span className="font-medium text-foreground">Personal</span> book for everyday spending
        and a <span className="font-medium text-foreground">Business</span> book for client
        income and expenses — each budgeted and reported on separately.
      </p>

      <div className="mt-5 flex flex-col gap-5">
        <Input
          label="Book name"
          placeholder="e.g. Business"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        {error && (
          <p className="text-[13px] text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Adding…" : "Add book"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
