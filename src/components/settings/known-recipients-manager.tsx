"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { TransferIcon } from "@/components/icons/dashboard-icons";
import {
  setRecipientOwnAccount,
  type KnownRecipientData,
} from "@/app/(app)/transactions/actions";

export function KnownRecipientsManager({
  knownRecipients,
}: {
  knownRecipients: KnownRecipientData[];
}) {
  const [recipients, setRecipients] = useState(knownRecipients);

  function handleUnflag(recipient: string) {
    setRecipients((prev) => prev.filter((r) => r.recipient !== recipient));
    void setRecipientOwnAccount(recipient, false);
  }

  return (
    <Card className="flex max-w-lg flex-col gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Known recipients</h2>
        <p className="mt-1 text-[13px] text-muted">
          Recipients you&apos;ve flagged as your own accounts. Transactions to or from them are
          treated as transfers, not income or spending.
        </p>
      </div>

      {recipients.length === 0 ? (
        <p className="text-[13px] text-muted-2">
          None yet — mark a recipient from the Transactions page.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {recipients.map((r) => (
            <li
              key={r.recipient}
              className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-canvas"
            >
              <span className="flex items-center gap-2 text-[13px] text-foreground">
                <TransferIcon className="h-4 w-4 text-violet-600" />
                {r.recipient}
              </span>
              <button
                type="button"
                onClick={() => handleUnflag(r.recipient)}
                className="text-[13px] font-medium text-muted hover:text-danger"
              >
                Unflag
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
