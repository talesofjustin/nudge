import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { CheckIcon } from "@/components/icons/dashboard-icons";

export function DoneStep({
  count,
  accountName,
  onImportAnother,
}: {
  count: number;
  accountName: string;
  onImportAnother: () => void;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 py-16 text-center">
      <IconChip tone="mint" size={48}>
        <CheckIcon className="h-5 w-5" />
      </IconChip>
      <h2 className="text-[20px] font-semibold text-ink">
        Imported {count} transaction{count === 1 ? "" : "s"} to {accountName}
      </h2>
      <p className="max-w-sm text-[14px] text-muted">
        They&apos;re uncategorized for now — head to Transactions once it&apos;s ready
        to review and label them.
      </p>
      <div className="mt-2 flex gap-3">
        <Link href="/transactions">
          <Button variant="secondary">View Transactions</Button>
        </Link>
        <Button variant="ghost" type="button" onClick={onImportAnother}>
          Import another file
        </Button>
      </div>
    </Card>
  );
}
