"use client";

import { useState } from "react";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SettingsIcon } from "@/components/icons/dashboard-icons";
import { logout } from "@/app/logout/actions";
import { useThemePreference } from "@/lib/use-theme-preference";
import type { ThemePreference } from "@/lib/supabase/database.types";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ProfileMenu({
  email,
  initialTheme,
}: {
  email: string;
  initialTheme: ThemePreference;
}) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useThemePreference(initialTheme);

  const initial = email.trim().charAt(0).toUpperCase() || "?";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-full px-2 py-1.5 text-left transition-colors hover:bg-surface"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-solid text-[13px] font-semibold text-white">
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
            {email}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start" sideOffset={6}>
        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 rounded-xl px-2 py-2 text-[13.5px] font-medium text-foreground hover:bg-canvas"
        >
          <SettingsIcon className="h-4 w-4 text-muted" />
          Settings
        </Link>

        <div className="mt-1 border-t border-border pt-2">
          <p className="px-2 text-[11px] font-medium tracking-wide text-muted-2 uppercase">
            Appearance
          </p>
          <div className="mt-1.5 flex gap-1 px-2">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-colors ${
                  theme === opt.value
                    ? "bg-ink-solid text-white"
                    : "bg-canvas text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <form action={logout} className="mt-2 border-t border-border pt-2">
          <button
            type="submit"
            className="w-full rounded-xl px-2 py-2 text-left text-[13.5px] font-medium text-muted hover:bg-canvas hover:text-foreground"
          >
            Log out
          </button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
