import type { ReactNode } from "react";

export type ChipTone = "mint" | "coral" | "amber" | "sky" | "violet";

const toneClass: Record<ChipTone, string> = {
  mint: "chip-mint",
  coral: "chip-coral",
  amber: "chip-amber",
  sky: "chip-sky",
  violet: "chip-violet",
};

export function IconChip({
  tone,
  size = 44,
  className = "",
  children,
}: {
  tone: ChipTone;
  size?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${toneClass[tone]} ${className}`}
      style={{ width: size, height: size }}
    >
      {children}
    </div>
  );
}
