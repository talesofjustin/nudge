import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "default" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

// Two sizes, chosen deliberately: `default` is reserved for page-level
// primary actions (the one prominent CTA on a page/wizard step — sign up,
// continue, set up budgets). `sm` is everything else: popovers, inline
// forms, table/list rows, and dialogs. Most buttons in this app are `sm`
// — defaulting to `default` everywhere is what produced "mega buttons" in
// compact contexts.
const sizes: Record<ButtonSize, string> = {
  default: "h-11 px-5 text-[15px]",
  sm: "h-9 px-3.5 text-[13px]",
};

// Colour is confined to `primary` (the gradient). `secondary` and `ghost`
// stay neutral on purpose — colour never lands on a secondary surface.
const variants: Record<ButtonVariant, string> = {
  primary: "gradient-accent text-white hover:shadow-accent hover:brightness-[1.04]",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-canvas",
  ghost: "text-muted hover:bg-canvas hover:text-foreground",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }
>(({ className = "", variant = "primary", size = "default", ...props }, ref) => (
  <button
    ref={ref}
    className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    {...props}
  />
));
Button.displayName = "Button";
