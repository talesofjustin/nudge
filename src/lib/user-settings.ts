"use server";

import { createClient } from "@/lib/supabase/server";
import type { DecimalSeparator, ThemePreference } from "@/lib/supabase/database.types";

export type UserSettings = {
  decimalSeparator: DecimalSeparator | null;
  timezone: string | null;
  paydayAnchorDay: number | null;
  budgetTipDismissed: boolean;
  theme: ThemePreference | null;
  bookSuggestionDismissed: boolean;
};

export async function getUserSettings(): Promise<UserSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      decimalSeparator: null,
      timezone: null,
      paydayAnchorDay: null,
      budgetTipDismissed: false,
      theme: null,
      bookSuggestionDismissed: false,
    };
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select(
      "decimal_separator, timezone, payday_anchor_day, budget_tip_dismissed, theme, book_suggestion_dismissed",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // A query error here (e.g. schema drift between this select and the
  // actual table — a migration that was never applied) used to fail
  // silently: `data` falls through to `null` below exactly like "no row
  // yet", so every setting quietly reads back as unset even though it's
  // saved. That's indistinguishable from a real bug in the UI, so it's
  // logged loudly instead of swallowed.
  if (error) {
    console.error("getUserSettings query failed:", error.message);
  }

  return {
    decimalSeparator: data?.decimal_separator ?? null,
    timezone: data?.timezone ?? null,
    paydayAnchorDay: data?.payday_anchor_day ?? null,
    budgetTipDismissed: data?.budget_tip_dismissed ?? false,
    theme: data?.theme ?? null,
    bookSuggestionDismissed: data?.book_suggestion_dismissed ?? false,
  };
}

// Fire-and-forget from the client is fine here: this only ever narrows null
// settings toward a detected/explicit value, never destructively overwrites.
export async function upsertUserSettings(
  partial: Partial<{
    decimalSeparator: DecimalSeparator;
    timezone: string;
    paydayAnchorDay: number | null;
    budgetTipDismissed: boolean;
    theme: ThemePreference;
    bookSuggestionDismissed: boolean;
  }>,
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      ...(partial.decimalSeparator !== undefined && {
        decimal_separator: partial.decimalSeparator,
      }),
      ...(partial.timezone !== undefined && { timezone: partial.timezone }),
      ...(partial.paydayAnchorDay !== undefined && {
        payday_anchor_day: partial.paydayAnchorDay,
      }),
      ...(partial.budgetTipDismissed !== undefined && {
        budget_tip_dismissed: partial.budgetTipDismissed,
      }),
      ...(partial.theme !== undefined && { theme: partial.theme }),
      ...(partial.bookSuggestionDismissed !== undefined && {
        book_suggestion_dismissed: partial.bookSuggestionDismissed,
      }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return { success: !error };
}
