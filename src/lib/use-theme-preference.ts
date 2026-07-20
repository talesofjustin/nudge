"use client";

import { useEffect, useRef, useState } from "react";
import { upsertUserSettings } from "@/lib/user-settings";
import type { ThemePreference } from "@/lib/supabase/database.types";
import { setThemeCookie } from "@/lib/theme-cookie";

// DOM/cookie/persistence side effects live in an effect (not the click
// handler that changes them) so a lint rule doesn't matter — this is also
// just the correct place for them regardless: the effect is the single
// spot that keeps the attribute, cookie, and DB row in sync with state.
export function useThemePreference(initialTheme: ThemePreference) {
  const [theme, setTheme] = useState<ThemePreference>(initialTheme);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (theme === "system") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
    setThemeCookie(theme);

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    void upsertUserSettings({ theme });
  }, [theme]);

  return [theme, setTheme] as const;
}
