"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "./actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { SsoRow } from "@/components/auth/sso-row";
import { Wordmark } from "@/components/ui/wordmark";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  if (state && "success" in state) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-3 text-center">
          <Wordmark />
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-foreground">
              Check your email
            </h1>
            <p className="mt-1 text-[15px] text-muted">
              We sent a confirmation link — click it to activate your
              account, then come back and log in.
            </p>
          </div>
          <Link
            href="/login"
            className="mt-4 text-sm font-medium text-violet-600 hover:underline"
          >
            Back to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-3 text-center">
        <Wordmark />
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            A gentle nudge toward better money habits.
          </p>
        </div>
      </div>

      <form action={action} className="mt-8 flex flex-col gap-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          required
          minLength={8}
          autoComplete="new-password"
        />

        {state?.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="mt-1 w-full">
          {pending ? "Creating account…" : "Sign up"}
        </Button>
      </form>

      <div className="my-6">
        <Divider>or continue with</Divider>
      </div>

      <SsoRow />

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-violet-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
