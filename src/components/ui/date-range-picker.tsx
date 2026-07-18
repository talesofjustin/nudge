"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/icons/dashboard-icons";

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function DateRangePicker({
  from,
  to,
  label,
  active,
  onChange,
}: {
  from: string;
  to: string;
  label: string;
  active: boolean;
  onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(from));
  const [pendingStart, setPendingStart] = useState<string | null>(from);
  const [pendingEnd, setPendingEnd] = useState<string | null>(to);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setPendingStart(from);
      setPendingEnd(to);
      setViewMonth(new Date(from));
    }
  }

  function handleDayClick(iso: string) {
    if (!pendingStart || (pendingStart && pendingEnd)) {
      setPendingStart(iso);
      setPendingEnd(null);
    } else if (iso < pendingStart) {
      setPendingEnd(pendingStart);
      setPendingStart(iso);
    } else {
      setPendingEnd(iso);
    }
  }

  function handleApply() {
    if (pendingStart && pendingEnd) {
      onChange(pendingStart, pendingEnd);
      setOpen(false);
    }
  }

  const cells = monthGrid(viewMonth.getFullYear(), viewMonth.getMonth());

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
            active
              ? "bg-ink-solid text-white"
              : "border border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-foreground"
          >
            <ChevronRightIcon className="h-4 w-4 rotate-180" />
          </button>
          <span className="text-[13px] font-medium text-foreground">
            {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </span>
          <button
            type="button"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-foreground"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-2">
          {WEEKDAY_LABELS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <span key={i} />;
            const iso = toISO(date);
            const isStart = iso === pendingStart;
            const isEnd = iso === pendingEnd;
            const inRange =
              !!pendingStart && !!pendingEnd && iso > pendingStart && iso < pendingEnd;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleDayClick(iso)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition-colors ${
                  isStart || isEnd
                    ? "bg-ink-solid text-white"
                    : inRange
                      ? "bg-violet-50 text-violet-600"
                      : "text-foreground hover:bg-canvas"
                }`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
          <Button variant="ghost" type="button" className="h-8 px-3 text-[13px]" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="h-8 px-3 text-[13px]"
            disabled={!pendingStart || !pendingEnd}
            onClick={handleApply}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
