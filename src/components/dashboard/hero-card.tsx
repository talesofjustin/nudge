"use client";

import { useState } from "react";
import { ChevronRightIcon, EyeIcon, EyeOffIcon } from "@/components/icons/dashboard-icons";

// TODO: replace hardcoded name/balance with the authenticated user's real data.
const NAME = "Alex";
const BALANCE = "$12,480.32";

export function HeroCard() {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="gradient-accent shadow-accent rounded-[20px] p-8 text-white">
      <p className="text-[14px] font-medium text-white/80">Hi {NAME} 👋</p>

      <div className="mt-4 flex items-end gap-2.5">
        <span className="text-[36px] font-bold tracking-tight tabular-nums">
          {hidden ? "••••••" : BALANCE}
        </span>
        <button
          type="button"
          onClick={() => setHidden((v) => !v)}
          aria-label={hidden ? "Show balance" : "Hide balance"}
          className="mb-2 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {hidden ? (
            <EyeIcon className="h-5 w-5" />
          ) : (
            <EyeOffIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      <p className="mt-1 text-[13px] text-white/70">
        Total balance across all accounts
      </p>

      <button
        type="button"
        className="mt-6 inline-flex h-9 items-center gap-1 rounded-full border border-white/25 bg-white/10 px-4 text-[13px] font-medium text-white transition-colors hover:bg-white/15"
      >
        Account details
        <ChevronRightIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
