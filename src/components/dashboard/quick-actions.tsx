import { Card } from "@/components/ui/card";
import { IconChip, type ChipTone } from "@/components/ui/icon-chip";
import {
  HeartIcon,
  TagIcon,
  TargetIcon,
  UploadIcon,
} from "@/components/icons/dashboard-icons";

// TODO: wire these up to real flows (statement import, categorization, budgets, wishlist).
const ACTIONS: { label: string; tone: ChipTone; icon: React.ReactNode }[] = [
  {
    label: "Import statement",
    tone: "sky",
    icon: <UploadIcon className="h-5 w-5" />,
  },
  {
    label: "Review uncategorized",
    tone: "amber",
    icon: <TagIcon className="h-5 w-5" />,
  },
  {
    label: "Set budget",
    tone: "violet",
    icon: <TargetIcon className="h-5 w-5" />,
  },
  {
    label: "Add to wishlist",
    tone: "coral",
    icon: <HeartIcon className="h-5 w-5" />,
  },
];

export function QuickActions() {
  return (
    <Card>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className="flex flex-col items-center gap-2.5 text-center transition-transform active:scale-95"
          >
            <IconChip tone={action.tone}>{action.icon}</IconChip>
            <span className="text-[13px] font-medium text-foreground">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
