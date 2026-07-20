"use client";

// Shared "always do X for this recipient?" prompt — used identically for
// book rules and category rules (same mechanism, two columns). Purely
// presentational: the caller owns what "confirm" actually does.
export function RecipientRuleOffer({
  message,
  onConfirm,
  onDismiss,
}: {
  message: string;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-violet-50 px-2 py-1 text-[12px] text-violet-600">
      <span>{message}</span>
      <button type="button" onClick={onConfirm} className="font-semibold hover:underline">
        Yes
      </button>
      <button type="button" onClick={onDismiss} className="text-muted hover:text-foreground">
        No
      </button>
    </div>
  );
}
