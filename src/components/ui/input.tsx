import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  // Omit entirely for compact inline uses (e.g. a table-row cell) where an
  // adjacent label already identifies the field — the wrapper then skips
  // the label row rather than reserving space for an empty one.
  label?: string;
  // Rendered inline at the input's left edge (e.g. a currency symbol) —
  // the sizing class passed via `className` moves to this wrapper so the
  // input itself can stay a plain w-full fill of it.
  prefix?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className = "", prefix, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-muted">
          {label}
        </label>
      )}
      <div className={`relative ${className}`}>
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-muted-2">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className={`h-11 w-full rounded-2xl border border-border bg-canvas text-[15px] text-foreground outline-none transition-[color,background-color,border-color,box-shadow] placeholder:text-muted-2 focus:border-violet-400 focus:bg-surface focus:shadow-[0_0_0_3px_var(--violet-200)] ${
            prefix ? "pl-7 pr-3.5" : "px-3.5"
          }`}
          {...props}
        />
      </div>
    </div>
  ),
);
Input.displayName = "Input";
