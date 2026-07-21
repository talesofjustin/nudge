"use client";

import { useState, type ReactNode } from "react";

// The inline "Delete → are you sure? Cancel/Confirm" pattern used across
// Transactions, Accounts, Books, Categories, and Rules — extracted once so
// every delete action gets the same confirmation instead of each screen
// rolling its own (or, as in Import history before this, skipping it).
export function ConfirmDeleteButton({
  onConfirm,
  label = "Delete",
  confirmMessage = "Delete?",
  confirmLabel = "Confirm",
  icon,
  showLabelWithIcon = false,
  className = "",
}: {
  onConfirm: () => Promise<void> | void;
  label?: string;
  confirmMessage?: string;
  confirmLabel?: string;
  // Renders an icon-only trigger (title=label) when set without
  // showLabelWithIcon; set both to show the icon next to visible text.
  icon?: ReactNode;
  showLabelWithIcon?: boolean;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);

  async function handleConfirm() {
    setWorking(true);
    await onConfirm();
    // No need to reset `working`/`confirming` on success — the row this
    // lives in is expected to unmount once the caller updates its list.
  }

  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-[12px] text-muted">{confirmMessage}</span>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={working}
          className="text-[12.5px] font-medium text-muted hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={working}
          className="text-[12.5px] font-medium text-danger hover:underline disabled:opacity-50"
        >
          {working ? "Removing…" : confirmLabel}
        </button>
      </div>
    );
  }

  if (icon && showLabelWithIcon) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`flex items-center gap-1.5 text-[12px] font-medium text-muted-2 hover:text-danger ${className}`}
      >
        {icon}
        {label}
      </button>
    );
  }

  if (icon) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title={label}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-2 transition-colors hover:bg-canvas hover:text-danger ${className}`}
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className={`text-[12.5px] font-medium text-muted-2 hover:text-danger ${className}`}
    >
      {label}
    </button>
  );
}
