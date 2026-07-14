"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { AccountType } from "@/lib/supabase/database.types";
import type { AccountChoice, SpaceChoice } from "@/app/(app)/import/actions";

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "paypal", label: "PayPal" },
  { value: "credit_card", label: "Credit card" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

type Props = {
  accounts: { id: string; name: string; type: AccountType }[];
  spaces: { id: string; name: string }[];
  accountChoice: AccountChoice;
  spaceChoice: SpaceChoice;
  onChangeAccount: (choice: AccountChoice) => void;
  onChangeSpace: (choice: SpaceChoice) => void;
  onBack: () => void;
  onNext: () => void;
};

export function AccountSpaceStep({
  accounts,
  spaces,
  accountChoice,
  spaceChoice,
  onChangeAccount,
  onChangeSpace,
  onBack,
  onNext,
}: Props) {
  const canContinue =
    accountChoice.kind === "existing" || accountChoice.name.trim().length > 0;

  return (
    <Card className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold text-ink">Which account is this?</h2>

        {accountChoice.kind === "existing" ? (
          <div className="flex flex-col gap-2">
            <Select
              value={accountChoice.id}
              onChange={(e) => onChangeAccount({ kind: "existing", id: e.target.value })}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => onChangeAccount({ kind: "new", name: "", type: "bank" })}
              className="self-start text-[13px] font-medium text-violet-600 hover:underline"
            >
              + Add a new account
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Account name"
                placeholder="e.g. Chase Checking"
                value={accountChoice.name}
                onChange={(e) =>
                  onChangeAccount({ ...accountChoice, name: e.target.value })
                }
              />
            </div>
            <div className="w-full sm:w-44">
              <Select
                label="Type"
                value={accountChoice.type}
                onChange={(e) =>
                  onChangeAccount({
                    ...accountChoice,
                    type: e.target.value as AccountType,
                  })
                }
              >
                {ACCOUNT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            {accounts.length > 0 && (
              <button
                type="button"
                onClick={() => onChangeAccount({ kind: "existing", id: accounts[0].id })}
                className="pb-3 text-[13px] font-medium text-muted hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold text-ink">
          Space <span className="font-normal text-muted">(optional)</span>
        </h2>

        {spaceChoice.kind === "new" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Space name"
                placeholder="e.g. Business"
                value={spaceChoice.name}
                onChange={(e) => onChangeSpace({ kind: "new", name: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={() => onChangeSpace({ kind: "none" })}
              className="pb-3 text-[13px] font-medium text-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Select
              value={spaceChoice.kind === "existing" ? spaceChoice.id : ""}
              onChange={(e) => {
                if (!e.target.value) onChangeSpace({ kind: "none" });
                else onChangeSpace({ kind: "existing", id: e.target.value });
              }}
            >
              <option value="">No space</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => onChangeSpace({ kind: "new", name: "" })}
              className="self-start text-[13px] font-medium text-violet-600 hover:underline"
            >
              + Add a new space
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" type="button" onClick={onBack}>
          Back
        </Button>
        <Button type="button" disabled={!canContinue} onClick={onNext}>
          Continue
        </Button>
      </div>
    </Card>
  );
}
