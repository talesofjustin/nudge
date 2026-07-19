"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Card } from "@/components/ui/card";
import { StepIndicator, type Step } from "@/components/import/step-indicator";
import { UploadStep } from "@/components/import/upload-step";
import { AccountSpaceStep } from "@/components/import/account-space-step";
import { MappingStep } from "@/components/import/mapping-step";
import { ReviewStep } from "@/components/import/review-step";
import { DoneStep } from "@/components/import/done-step";
import { ProcessingIndicator } from "@/components/import/processing-indicator";
import { guessColumnMapping, type ColumnMapping, type ParsedRow } from "@/lib/csv";
import {
  importTransactions,
  type AccountChoice,
  type ImportRow,
  type SpaceChoice,
} from "@/app/(app)/import/actions";
import { upsertUserSettings, type UserSettings } from "@/lib/user-settings";
import type { AccountType } from "@/lib/supabase/database.types";

type AccountOption = { id: string; name: string; type: AccountType };
type SpaceOption = { id: string; name: string };

const EMPTY_MAPPING: ColumnMapping = {
  date: null,
  amount: null,
  recipient: null,
  description: null,
  sign: null,
};

export function ImportWizard({
  accounts,
  spaces,
  settings,
}: {
  accounts: AccountOption[];
  spaces: SpaceOption[];
  settings: UserSettings;
}) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("upload");
  const [reading, setReading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [fileName, setFileName] = useState<string | null>(null);

  const [accountChoice, setAccountChoice] = useState<AccountChoice>(
    accounts.length > 0
      ? { kind: "existing", id: accounts[0].id }
      : { kind: "new", name: "", type: "bank" },
  );
  const [spaceChoice, setSpaceChoice] = useState<SpaceChoice>({ kind: "none" });

  const [pendingRows, setPendingRows] = useState<ImportRow[]>([]);
  const [pendingSkippedCount, setPendingSkippedCount] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    count: number;
    accountName: string;
    skippedCount: number;
    statementStartDate: string | null;
    statementEndDate: string | null;
  } | null>(null);

  // Formalises the timezone the date parser's free-text fallback uses: the
  // user's stored preference if they have one, otherwise the browser's own
  // timezone, persisted silently below so it becomes an explicit, stable
  // setting rather than an implicit one re-detected every time.
  const [timezone] = useState(
    () => settings.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  );

  useEffect(() => {
    if (settings.timezone) return;
    void upsertUserSettings({ timezone });
    // Only ever runs once per mount — settings.timezone is a server-fetched
    // initial value, not expected to change during this session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFile(file: File) {
    setReading(true);
    setParseError(null);
    setFileName(file.name || null);

    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setReading(false);
        if (results.data.length === 0) {
          setParseError("This file doesn't contain any rows.");
          return;
        }
        const fields = results.meta.fields ?? [];
        setRows(results.data);
        setHeaders(fields);
        setMapping(guessColumnMapping(fields));
        setStep("account");
      },
      error: (err) => {
        setReading(false);
        setParseError(err.message || "Could not read this file.");
      },
    });
  }

  function handleMappingConfirm(validRows: ImportRow[], skippedCount: number) {
    setPendingRows(validRows);
    setPendingSkippedCount(skippedCount);
    setStep("review");
  }

  async function handleFinalConfirm() {
    setSubmitting(true);
    setSubmitError(null);
    const res = await importTransactions(
      accountChoice,
      spaceChoice,
      pendingRows,
      fileName,
      pendingSkippedCount,
    );
    setSubmitting(false);

    if (!res.success) {
      setSubmitError(res.error);
      setStep("mapping");
      return;
    }

    setResult({
      count: res.count,
      accountName: res.accountName,
      skippedCount: res.skippedCount,
      statementStartDate: res.statementStartDate,
      statementEndDate: res.statementEndDate,
    });
    setStep("done");
    // Re-fetch server data (accounts/spaces/settings + import history) in the
    // background so the history list below reflects this import.
    router.refresh();
  }

  function handleImportAnother() {
    setRows([]);
    setHeaders([]);
    setMapping(EMPTY_MAPPING);
    setFileName(null);
    setPendingRows([]);
    setPendingSkippedCount(0);
    setSubmitError(null);
    setResult(null);
    setStep("upload");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* px-6 matches Card's own p-6 (used below and by ImportHistory) so the
          indicator's left/right edges line up with the card content's edges
          rather than spanning the full, wider container. */}
      <div className="px-6">
        <StepIndicator step={step} />
      </div>

      {submitting ? (
        <Card>
          <ProcessingIndicator variant="importing" />
        </Card>
      ) : (
        <>
          {step === "upload" && (
            <UploadStep onFile={handleFile} reading={reading} error={parseError} />
          )}

          {step === "account" && (
            <AccountSpaceStep
              accounts={accounts}
              spaces={spaces}
              accountChoice={accountChoice}
              spaceChoice={spaceChoice}
              onChangeAccount={setAccountChoice}
              onChangeSpace={setSpaceChoice}
              onBack={() => setStep("upload")}
              onNext={() => setStep("mapping")}
            />
          )}

          {step === "mapping" && (
            <MappingStep
              headers={headers}
              rows={rows}
              mapping={mapping}
              onChangeMapping={setMapping}
              timezone={timezone}
              defaultDecimalSeparator={settings.decimalSeparator}
              onBack={() => setStep("account")}
              onConfirm={handleMappingConfirm}
              submitError={submitError}
            />
          )}

          {step === "review" && (
            <ReviewStep
              rows={pendingRows}
              accountChoice={accountChoice}
              onBack={() => setStep("mapping")}
              onConfirm={handleFinalConfirm}
            />
          )}

          {step === "done" && result && (
            <DoneStep
              count={result.count}
              accountName={result.accountName}
              skippedCount={result.skippedCount}
              statementStartDate={result.statementStartDate}
              statementEndDate={result.statementEndDate}
              onImportAnother={handleImportAnother}
            />
          )}
        </>
      )}
    </div>
  );
}
