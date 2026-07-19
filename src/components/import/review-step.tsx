"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { CheckIcon } from "@/components/icons/dashboard-icons";
import { ProcessingIndicator } from "@/components/import/processing-indicator";
import { runImportChecks, type AccountChoice, type ImportRow } from "@/app/(app)/import/actions";
import { resolveTransferFlag } from "@/app/(app)/transactions/actions";
import type { FlagItem, ImportFlag } from "@/lib/import-checks";

type ItemState = FlagItem & { resolved: boolean };
type FlagState = Omit<ImportFlag, "items"> & { resolved: boolean; items?: ItemState[] };

function isFlagResolved(flag: FlagState): boolean {
  if (flag.items) return flag.items.every((i) => i.resolved);
  return flag.resolved;
}

export function ReviewStep({
  rows,
  accountChoice,
  onBack,
  onConfirm,
}: {
  rows: ImportRow[];
  accountChoice: AccountChoice;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [status, setStatus] = useState<"checking" | "clear" | "flags">("checking");
  const [flags, setFlags] = useState<FlagState[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const start = Date.now();
      const result = await runImportChecks(accountChoice, rows);
      // Always show the "Checking…" state for at least a beat, even if the
      // checks resolve instantly, so it doesn't feel like a jarring skip.
      const minDelay = Math.max(0, 700 - (Date.now() - start));
      await new Promise((r) => setTimeout(r, minDelay));
      if (cancelled) return;

      if (result.flags.length === 0) {
        setStatus("clear");
        setTimeout(() => {
          if (!cancelled) onConfirm();
        }, 900);
      } else {
        setFlags(
          result.flags.map((f) => ({
            ...f,
            resolved: false,
            items: f.items?.map((i) => ({ ...i, resolved: false })),
          })),
        );
        setStatus("flags");
      }
    })();

    return () => {
      cancelled = true;
    };
    // Runs once against the rows/account this step was mounted with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFlagAction(flag: FlagState, actionId: string) {
    if (flag.checkId === "duplicate-import" && actionId === "cancel") {
      onBack();
      return;
    }
    setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, resolved: true } : f)));
  }

  async function handleItemAction(flag: FlagState, item: ItemState, actionId: string) {
    if (flag.checkId === "transfer-detection" && item.data?.recipient) {
      if (actionId === "own") await resolveTransferFlag(item.data.recipient, true);
      if (actionId === "shared") await resolveTransferFlag(item.data.recipient, false);
      // "later" leaves no known_recipients row, so this recipient is
      // re-evaluated on the next import.
    }

    setFlags((prev) =>
      prev.map((f) =>
        f.id === flag.id
          ? {
              ...f,
              items: f.items?.map((i) => (i.id === item.id ? { ...i, resolved: true } : i)),
            }
          : f,
      ),
    );
  }

  if (status === "checking") {
    return (
      <Card>
        <ProcessingIndicator variant="reviewing" />
      </Card>
    );
  }

  if (status === "clear") {
    return (
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <IconChip tone="mint" size={48}>
          <CheckIcon className="h-5 w-5" />
        </IconChip>
        <p className="text-[15px] font-medium text-foreground">Everything looks in order</p>
      </Card>
    );
  }

  const allResolved = flags.every(isFlagResolved);

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Before we import…</h2>
        <p className="mt-1 text-[13px] text-muted">A couple of things worth double-checking.</p>
      </div>

      <div className="flex flex-col gap-3">
        {flags.map((flag) => {
          const resolved = isFlagResolved(flag);
          return (
            <div
              key={flag.id}
              className={`rounded-2xl border p-4 transition-colors ${
                resolved ? "border-border bg-canvas opacity-60" : "border-violet-400 bg-canvas"
              }`}
            >
              <p className="text-[14px] font-medium text-foreground">{flag.title}</p>
              <p className="mt-1 text-[13px] text-muted">{flag.message}</p>

              {flag.evidence && flag.evidence.length > 0 && (
                <ul className="mt-2 flex flex-col gap-0.5 rounded-xl bg-surface p-2.5 text-[12px] text-muted">
                  {flag.evidence.map((line, i) => (
                    <li key={i} className="font-mono">
                      {line}
                    </li>
                  ))}
                </ul>
              )}

              {flag.items ? (
                <div className="mt-3 flex flex-col gap-2">
                  {flag.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2"
                    >
                      <span className="text-[13px] font-medium text-foreground">
                        {item.label}
                      </span>
                      {item.resolved ? (
                        <span className="text-[12px] font-medium text-mint">Resolved</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {item.actions.map((action) => (
                            <Button
                              key={action.id}
                              type="button"
                              variant={action.variant ?? "secondary"}
                              className="h-7 px-2.5 text-[12px]"
                              onClick={() => handleItemAction(flag, item, action.id)}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : flag.resolved ? (
                <p className="mt-2 text-[12px] font-medium text-mint">Resolved</p>
              ) : (
                <div className="mt-3 flex gap-2">
                  {(flag.actions ?? []).map((action) => (
                    <Button
                      key={action.id}
                      type="button"
                      variant={action.variant ?? "secondary"}
                      className="h-8 px-3 text-[13px]"
                      onClick={() => handleFlagAction(flag, action.id)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" type="button" onClick={onBack}>
          Back
        </Button>
        <Button type="button" disabled={!allResolved} onClick={onConfirm}>
          Continue to import
        </Button>
      </div>
    </Card>
  );
}
