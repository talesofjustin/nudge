import { Card } from "@/components/ui/card";
import { IconChip, type ChipTone } from "@/components/ui/icon-chip";
import { Sparkline } from "@/components/dashboard/sparkline";
import {
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "@/components/icons/dashboard-icons";
import type { CardTone } from "@/components/ui/card";

// TODO: replace with real monthly aggregates once the transactions table exists.
const STATS: {
  label: string;
  value: string;
  tone: CardTone & ChipTone;
  icon: React.ReactNode;
  data: number[];
}[] = [
  {
    label: "Income",
    value: "$4,250",
    tone: "mint",
    icon: <TrendingUpIcon className="h-4.5 w-4.5" />,
    data: [8, 10, 9, 12, 14, 13, 16],
  },
  {
    label: "Expenses",
    value: "$2,830",
    tone: "coral",
    icon: <TrendingDownIcon className="h-4.5 w-4.5" />,
    data: [6, 9, 8, 11, 9, 12, 10],
  },
  {
    label: "Saved this month",
    value: "$1,420",
    tone: "violet",
    icon: <WalletIcon className="h-4.5 w-4.5" />,
    data: [3, 4, 6, 5, 8, 9, 11],
  },
];

const sparklineColor: Record<string, string> = {
  mint: "var(--mint)",
  coral: "var(--coral)",
  violet: "var(--violet-600)",
};

export function StatTrio() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {STATS.map((stat) => (
        <Card key={stat.label} tone={stat.tone} className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <IconChip tone={stat.tone} size={36}>
              {stat.icon}
            </IconChip>
            <Sparkline data={stat.data} color={sparklineColor[stat.tone]} />
          </div>
          <div>
            <p className="text-[13px] font-medium text-muted">{stat.label}</p>
            <p className="mt-1 text-[30px] font-bold tracking-tight text-ink tabular-nums">
              {stat.value}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
