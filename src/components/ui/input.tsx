import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-muted">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        className={`h-11 rounded-2xl border border-border bg-canvas px-3.5 text-[15px] text-foreground outline-none transition-[color,background-color,border-color,box-shadow] placeholder:text-muted-2 focus:border-violet-400 focus:bg-surface focus:shadow-[0_0_0_3px_var(--violet-200)] ${className}`}
        {...props}
      />
    </div>
  ),
);
Input.displayName = "Input";
