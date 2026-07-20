import { Pill } from "@/components/ui/pill";
import { TagIcon, TransferIcon } from "@/components/icons/dashboard-icons";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import type { CategoryKind } from "@/lib/supabase/database.types";

export type CategoryInfo = { id: string; name: string; color: string; icon: string; kind: CategoryKind };

export function CategoryBadge({
  category,
  className = "",
  emptyLabel = "Uncategorized",
  // Auto-applied by a recipient rule on import, not yet consciously passed
  // over by the user — dashed outline + reduced opacity, cleared the
  // moment the category picker is used on this row (even reselecting the
  // same value counts as review).
  unreviewed = false,
}: {
  category: CategoryInfo | null;
  className?: string;
  emptyLabel?: string;
  unreviewed?: boolean;
}) {
  if (!category) {
    return <Pill className={className}>{emptyLabel}</Pill>;
  }

  const Icon = CATEGORY_ICONS[category.icon] ?? TagIcon;
  // Category colors are picked for chip backgrounds, not text contrast, so
  // text/icon mix toward --ink rather than using the raw color — --ink flips
  // dark/light with the theme, so this darkens in light mode and lightens in
  // dark mode instead of only ever darkening (which would kill contrast on
  // the dark-mode chip background).
  const textColor = `color-mix(in srgb, ${category.color} 55%, var(--ink))`;

  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ${
        unreviewed ? "border border-dashed opacity-70" : ""
      } ${className}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${category.color} 18%, var(--tint-base))`,
        color: textColor,
        ...(unreviewed && { borderColor: textColor }),
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      {category.name}
    </span>
  );
}

export function TransferBadge({ className = "" }: { className?: string }) {
  // Same theme-aware color-mix approach as CategoryBadge — a fixed
  // text-violet-600 reads fine in light mode but loses contrast once
  // bg-violet-50 flips dark in dark mode.
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ${className}`}
      style={{
        backgroundColor: "color-mix(in srgb, var(--violet-400) 18%, var(--tint-base))",
        color: "color-mix(in srgb, var(--violet-400) 55%, var(--ink))",
      }}
    >
      <TransferIcon className="h-3.5 w-3.5" />
      Transfer
    </span>
  );
}
