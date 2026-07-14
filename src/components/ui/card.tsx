import type { HTMLAttributes } from "react";

export type CardTone = "surface" | "mint" | "coral" | "amber" | "sky" | "violet";

const toneClass: Record<CardTone, string> = {
  surface: "bg-surface border border-border",
  mint: "tint-mint",
  coral: "tint-coral",
  amber: "tint-amber",
  sky: "tint-sky",
  violet: "tint-violet",
};

export function Card({
  tone = "surface",
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: CardTone }) {
  return (
    <div
      className={`shadow-soft rounded-[20px] p-6 ${toneClass[tone]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
