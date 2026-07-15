import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-medium transition-all duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

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
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
>(({ className = "", variant = "primary", ...props }, ref) => (
  <button
    ref={ref}
    className={`${base} ${variants[variant]} ${className}`}
    {...props}
  />
));
Button.displayName = "Button";
