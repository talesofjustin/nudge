"use server";

import { createClient } from "@/lib/supabase/server";

export type SignupFormState =
  | { error: string }
  | { success: true }
  | undefined;

export async function signup(
  _prevState: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
