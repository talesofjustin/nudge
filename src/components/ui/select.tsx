import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronRightIcon } from "@/components/icons/dashboard-icons";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, id, className = "", children, ...props }, ref) => {
    const select = (
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={`h-11 w-full appearance-none rounded-2xl border border-border bg-canvas pl-3.5 pr-9 text-[15px] text-foreground outline-none transition-[color,background-color,border-color,box-shadow] focus:border-violet-400 focus:bg-surface focus:shadow-[0_0_0_3px_var(--violet-200)] ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronRightIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-muted-2" />
      </div>
    );

    if (!label) return select;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-[13px] font-medium text-muted">
          {label}
        </label>
        {select}
      </div>
    );
  },
);
Select.displayName = "Select";
