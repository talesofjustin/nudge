"use client";

import { useRef, useState, type DragEvent } from "react";
import { Card } from "@/components/ui/card";
import { IconChip } from "@/components/ui/icon-chip";
import { UploadIcon } from "@/components/icons/dashboard-icons";

export function UploadStep({
  onFile,
  reading,
  error,
}: {
  onFile: (file: File) => void;
  reading: boolean;
  error: string | null;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <Card>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
          dragOver ? "border-violet-400 bg-canvas" : "border-border"
        }`}
      >
        <IconChip tone="violet" size={48}>
          <UploadIcon className="h-5 w-5" />
        </IconChip>

        {reading ? (
          <p className="text-[15px] font-medium text-foreground">Reading file…</p>
        ) : (
          <>
            <p className="text-[15px] font-medium text-foreground">
              Drag and drop your CSV here, or click to browse
            </p>
            <p className="text-[13px] text-muted">
              Exported from your bank or card statement
            </p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
