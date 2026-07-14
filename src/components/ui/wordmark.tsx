// Placeholder wordmark — a custom mark is coming later.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`text-xl font-semibold tracking-tight text-ink ${className}`}
    >
      Nudge
    </span>
  );
}
