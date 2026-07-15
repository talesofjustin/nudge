import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

// Static value badge — e.g. the trailing amount on an inactive chart bar.
export function Pill({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex h-7 items-center justify-center rounded-full border border-border bg-canvas px-2.5 text-[12px] font-medium text-muted ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

// Interactive chip — e.g. the Income/Expense filters on recent transactions.
// Colour never appears here: active = ink, inactive = soft neutral.
export function FilterChip({
  active,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center justify-center rounded-full px-3.5 text-[13px] font-medium transition-colors ${
        active
          ? "bg-ink-solid text-white"
          : "border border-border bg-surface text-muted hover:text-foreground"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
