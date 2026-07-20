"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Card } from "@/components/ui/card";
import { StepIndicator, type Step } from "@/components/import/step-indicator";
import { AccountStep } from "@/components/import/account-step";
import { UploadStep } from "@/components/import/upload-step";
import { MappingStep } from "@/components/import/mapping-step";
import { ReviewStep } from "@/components/import/review-step";
import { DoneStep } from "@/components/import/done-step";
import { ProcessingIndicator } from "@/components/import/processing-indicator";
import type { BookInfo } from "@/components/transactions/book-picker";
import { guessColumnMapping, mapRows, type ColumnMapping, type ParsedRow } from "@/lib/csv";
import {
  importTransactions,
  saveColumnMapping,
  type ImportAccountOption,
  type ImportRow,
} from "@/app/(app)/import/actions";
import { upsertUserSettings, type UserSettings } from "@/lib/user-settings";
import type { DecimalSeparator } from "@/lib/supabase/database.types";

const EMPTY_MAPPING: ColumnMapping = {
  date: null,
  amount: null,
  recipient: null,
  description: null,
  sign: null,
};

export function ImportWizard({
  accounts,
  books,
  settings,
}: {
  accounts: ImportAccountOption[];
  books: BookInfo[];
  settings: UserSettings;
}) {
  const router = useRouter();

  const [step, setStep] = useState<Step>("account");
  const [accountId, setAccountId] = useState<string | null>(accounts[0]?.id ?? null);
  const selectedAccount = accounts.find((a) => a.id === accountId) ?? null;

  const [reading, setReading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showMappingUi, setShowMappingUi] = useState(false);
  const [usedSavedMapping, setUsedSavedMapping] = useState(false);

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

  const [timezone] = useState(
    () => settings.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  );

  useEffect(() => {
    if (settings.timezone) return;
    void upsertUserSettings({ timezone });
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
        setParsedRows(results.data);
        setHeaders(fields);

        const saved = selectedAccount?.columnMapping;
        if (saved) {
          const savedMapping: ColumnMapping = {
            date: saved.date,
            amount: saved.amount,
            recipient: saved.recipient,
            description: saved.description,
            sign: saved.sign,
          };
          const mapped = mapRows(results.data, savedMapping, {
            decimalSeparator: saved.decimalSeparator,
            timezone,
            expenseValue: saved.expenseValue,
          });
          const validRows = mapped.filter((r) => r.valid);
          setPendingRows(
            validRows.map((r) => ({
              date: r.date!,
              amount: r.amount!,
              recipient: r.recipient,
              description: r.description,
            })),
          );
          setPendingSkippedCount(mapped.length - validRows.length);
          setUsedSavedMapping(true);
          setStep("review");
        } else {
          setMapping(guessColumnMapping(fields));
          setShowMappingUi(true);
        }
      },
      error: (err) => {
        setReading(false);
        setParseError(err.message || "Could not read this file.");
      },
    });
  }

  async function handleMappingConfirm(
    validRows: ImportRow[],
    skippedCount: number,
    decimalSeparator: DecimalSeparator,
    expenseValue: string | null,
  ) {
    if (accountId) {
      void saveColumnMapping(accountId, { ...mapping, decimalSeparator, expenseValue });
    }
    setPendingRows(validRows);
    setPendingSkippedCount(skippedCount);
    setUsedSavedMapping(false);
    setShowMappingUi(false);
    setStep("review");
  }

  async function handleFinalConfirm(selectedRows: ImportRow[], bookOverrides: Record<string, string>) {
    if (!accountId) return;
    setSubmitting(true);
    setSubmitError(null);
    const res = await importTransactions(accountId, selectedRows, fileName, pendingSkippedCount, bookOverrides);
    setSubmitting(false);

    if (!res.success) {
      setSubmitError(res.error);
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
    router.refresh();
  }

  function handleImportAnother() {
    setParsedRows([]);
    setHeaders([]);
    setMapping(EMPTY_MAPPING);
    setFileName(null);
    setShowMappingUi(false);
    setUsedSavedMapping(false);
    setPendingRows([]);
    setPendingSkippedCount(0);
    setSubmitError(null);
    setResult(null);
    setStep("account");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="px-6">
        <StepIndicator step={step} />
      </div>

      {submitting ? (
        <Card>
          <ProcessingIndicator variant="importing" />
        </Card>
      ) : (
        <>
          {step === "account" && (
            <AccountStep
              accounts={accounts}
              selectedId={accountId}
              onSelect={setAccountId}
              onAccountAdded={setAccountId}
              onNext={() => setStep("upload")}
            />
          )}

          {step === "upload" && !showMappingUi && (
            <UploadStep onFile={handleFile} reading={reading} error={parseError} />
          )}

          {step === "upload" && showMappingUi && (
            <MappingStep
              headers={headers}
              rows={parsedRows}
              mapping={mapping}
              onChangeMapping={setMapping}
              timezone={timezone}
              defaultDecimalSeparator={settings.decimalSeparator}
              onBack={() => {
                setShowMappingUi(false);
                setStep("account");
              }}
              onConfirm={handleMappingConfirm}
              submitError={submitError}
            />
          )}

          {step === "review" && (
            <ReviewStep
              rows={pendingRows}
              accountId={accountId!}
              books={books}
              onBack={() => {
                setStep("upload");
                if (!usedSavedMapping) setShowMappingUi(true);
              }}
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
