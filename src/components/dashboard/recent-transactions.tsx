"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/pill";
import { IconChip, type ChipTone } from "@/components/ui/icon-chip";
import {
  ChevronRightIcon,
  SearchIcon,
  TagIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UploadIcon,
} from "@/components/icons/dashboard-icons";

type TxType = "income" | "expense";

// TODO: replace with real transactions once the transactions table exists.
const TRANSACTIONS: {
  id: string;
  name: string;
  date: string;
  category: string;
  amount: number;
  type: TxType;
  tone: ChipTone;
  icon: React.ReactNode;
}[] = [
  {
    id: "1",
    name: "Paycheck",
    date: "Jul 12",
    category: "Income",
    amount: 3200,
    type: "income",
    tone: "mint",
    icon: <TrendingUpIcon className="h-4.5 w-4.5" />,
  },
  {
    id: "2",
    name: "Whole Foods",
    date: "Jul 11",
    category: "Groceries",
    amount: -84.32,
    type: "expense",
    tone: "coral",
    icon: <TrendingDownIcon className="h-4.5 w-4.5" />,
  },
  {
    id: "3",
    name: "Statement import",
    date: "Jul 10",
    category: "System",
    amount: 0,
    type: "expense",
    tone: "sky",
    icon: <UploadIcon className="h-4.5 w-4.5" />,
  },
  {
    id: "4",
    name: "Uncategorized transfer",
    date: "Jul 9",
    category: "Uncategorized",
    amount: -46.5,
    type: "expense",
    tone: "amber",
    icon: <TagIcon className="h-4.5 w-4.5" />,
  },
  {
    id: "5",
    name: "Freelance invoice",
    date: "Jul 8",
    category: "Income",
    amount: 640,
    type: "income",
    tone: "mint",
    icon: <TrendingUpIcon className="h-4.5 w-4.5" />,
  },
];

const FILTERS = ["All", "Income", "Expense"] as const;

export function RecentTransactions() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return TRANSACTIONS.filter((t) => {
      const matchesFilter =
        filter === "All" ||
        (filter === "Income" && t.type === "income") ||
        (filter === "Expense" && t.type === "expense");
      const matchesQuery = t.name.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-ink">Recent transactions</h2>
        <Link
          href="#"
          className="flex items-center gap-0.5 text-[13px] font-medium text-violet-600 hover:underline"
        >
          See all
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[180px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions"
            className="h-10 w-full rounded-full border border-border bg-canvas pl-10 pr-4 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-2 focus:border-violet-400 focus:bg-surface focus:ring-4 focus:ring-violet-400/15"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-border">
        {filtered.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-3">
              <IconChip tone={t.tone} size={36}>
                {t.icon}
              </IconChip>
              <div>
                <p className="text-[14px] font-medium text-ink">{t.name}</p>
                <p className="text-[12.5px] text-muted">
                  {t.date} · {t.category}
                </p>
              </div>
            </div>
            <span
              className={`text-[14px] font-semibold tabular-nums ${
                t.amount > 0 ? "text-mint" : "text-ink"
              }`}
            >
              {t.amount === 0
                ? "—"
                : `${t.amount > 0 ? "+" : "-"}$${Math.abs(t.amount).toFixed(2)}`}
            </span>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted">
            No transactions match “{query}”.
          </p>
        )}
      </div>
    </Card>
  );
}
