"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "./actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { SsoRow } from "@/components/auth/sso-row";
import { Wordmark } from "@/components/ui/wordmark";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-3 text-center">
        <Wordmark />
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Log in to keep an eye on your money.
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
          autoComplete="current-password"
        />

        {state?.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="mt-1 w-full">
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <div className="my-6">
        <Divider>or continue with</Divider>
      </div>

      <SsoRow />

      <p className="mt-6 text-center text-sm text-muted">
        No account?{" "}
        <Link href="/signup" className="font-medium text-violet-600 hover:underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
