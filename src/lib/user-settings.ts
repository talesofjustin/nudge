"use server";

import { createClient } from "@/lib/supabase/server";
import type { DecimalSeparator } from "@/lib/supabase/database.types";

export type UserSettings = {
  decimalSeparator: DecimalSeparator | null;
  timezone: string | null;
};

export async function getUserSettings(): Promise<UserSettings> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { decimalSeparator: null, timezone: null };

  const { data } = await supabase
    .from("user_settings")
    .select("decimal_separator, timezone")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    decimalSeparator: data?.decimal_separator ?? null,
    timezone: data?.timezone ?? null,
  };
}

// Fire-and-forget from the client is fine here: this only ever narrows null
// settings toward a detected/explicit value, never destructively overwrites.
export async function upsertUserSettings(
  partial: Partial<{ decimalSeparator: DecimalSeparator; timezone: string }>,
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
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return { success: !error };
}
