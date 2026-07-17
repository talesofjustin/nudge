import { Pill } from "@/components/ui/pill";
import { TagIcon } from "@/components/icons/dashboard-icons";
import { CATEGORY_ICONS } from "@/lib/category-icons";

export type CategoryInfo = { id: string; name: string; color: string; icon: string };

export function CategoryBadge({
  category,
  className = "",
}: {
  category: CategoryInfo | null;
  className?: string;
}) {
  if (!category) {
    return <Pill className={className}>Uncategorized</Pill>;
  }

  const Icon = CATEGORY_ICONS[category.icon] ?? TagIcon;

  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ${className}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${category.color} 18%, var(--tint-base))`,
        color: category.color,
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      {category.name}
    </span>
  );
}
