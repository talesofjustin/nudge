"use client";

import { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { CheckIcon } from "@/components/icons/dashboard-icons";
import { formatStatementPeriod } from "@/lib/statement-period";

export function DoneStep({
  count,
  accountName,
  skippedCount,
  statementStartDate,
  statementEndDate,
  onImportAnother,
}: {
  count: number;
  accountName: string;
  skippedCount: number;
  statementStartDate: string | null;
  statementEndDate: string | null;
  onImportAnother: () => void;
}) {
  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      startVelocity: 45,
      origin: { y: 0.6 },
      colors: ["#7c3aed", "#a855f7", "#34d399", "#60a5fa"],
    });
  }, []);

  const statementPeriod = formatStatementPeriod(statementStartDate, statementEndDate);

  return (
    <Card className="flex flex-col items-center gap-3 py-16 text-center">
      <IconChip tone="mint" size={48}>
        <CheckIcon className="h-5 w-5" />
      </IconChip>
      <h2 className="text-[20px] font-semibold text-ink">Import finished</h2>

      <div className="mt-1 flex flex-col gap-1 text-[14px] text-muted">
        <p>
          <span className="font-medium text-foreground">
            {count} transaction{count === 1 ? "" : "s"}
          </span>{" "}
          imported to <span className="font-medium text-foreground">{accountName}</span>
        </p>
        {skippedCount > 0 && (
          <p>
            {skippedCount} row{skippedCount === 1 ? "" : "s"} skipped
          </p>
        )}
        {statementPeriod && <p>Statement period: {statementPeriod}</p>}
      </div>

      <div className="mt-3 flex gap-3">
        <Link href="/transactions">
          <Button>Go to Transactions</Button>
        </Link>
        <Button variant="ghost" type="button" onClick={onImportAnother}>
          Import another statement
        </Button>
      </div>
    </Card>
  );
}
