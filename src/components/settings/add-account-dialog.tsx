"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/pill";
import { createAccount } from "@/app/(app)/settings/actions";
import type { AccountType } from "@/lib/supabase/database.types";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "paypal", label: "PayPal" },
  { value: "credit_card", label: "Credit card" },
  { value: "other", label: "Other" },
];

// The three preset answers plus free text — deliberately never says "book"
// anywhere in this dialog. Whatever the user answers becomes (or reuses)
// a book behind the scenes.
const PRESET_ANSWERS = ["Personal", "Business", "Shared"];
const OTHER = "__other__";

export function AddAccountDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (accountId: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [answer, setAnswer] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setType("bank");
    setAnswer(null);
    setOtherText("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const resolvedAnswer = answer === OTHER ? otherText.trim() : answer;

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Give the account a name.");
      return;
    }
    if (!resolvedAnswer) {
      setError("Let us know what this account is for.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const res = await createAccount(name.trim(), type, resolvedAnswer);
    setSubmitting(false);

    if (!res.success || !res.id) {
      setError(res.error ?? "Could not create account.");
      return;
    }

    router.refresh();
    onCreated?.(res.id);
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <h2 className="text-[16px] font-semibold text-ink">Add account</h2>

      <div className="mt-5 flex flex-col gap-5">
        <Input
          label="Account name"
          placeholder="e.g. ING Checking"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Type</span>
          <div className="flex flex-wrap gap-1.5">
            {ACCOUNT_TYPES.map((t) => (
              <FilterChip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
                {t.label}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">What&apos;s this account for?</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_ANSWERS.map((a) => (
              <FilterChip key={a} active={answer === a} onClick={() => setAnswer(a)}>
                {a}
              </FilterChip>
            ))}
            <FilterChip active={answer === OTHER} onClick={() => setAnswer(OTHER)}>
              Something else
            </FilterChip>
          </div>
          {answer === OTHER && (
            <Input
              placeholder="What's it for?"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              className="mt-1"
              autoFocus
            />
          )}
        </div>

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
            {submitting ? "Adding…" : "Add account"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
