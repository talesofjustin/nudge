"use client";

import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/pill";
import { useThemePreference } from "@/lib/use-theme-preference";
import type { ThemePreference } from "@/lib/supabase/database.types";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function AppearancePanel({ initialTheme }: { initialTheme: ThemePreference }) {
  const [theme, setTheme] = useThemePreference(initialTheme);

  return (
    <Card className="flex max-w-lg flex-col gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Appearance</h2>
        <p className="mt-1 text-[13px] text-muted">Choose how Nudge looks on this device.</p>
      </div>
      <div className="flex gap-2">
        {THEME_OPTIONS.map((opt) => (
          <FilterChip key={opt.value} active={theme === opt.value} onClick={() => setTheme(opt.value)}>
            {opt.label}
          </FilterChip>
        ))}
      </div>
    </Card>
  );
}
