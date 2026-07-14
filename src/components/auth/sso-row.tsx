"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google-icon";
import { FacebookIcon } from "@/components/icons/facebook-icon";

export function SsoRow() {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  function handleClick(provider: string) {
    setMessage(`${provider} sign-in is coming soon`);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setMessage(null), 2400);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleClick("Google")}
        >
          <GoogleIcon />
          Google
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleClick("Facebook")}
        >
          <FacebookIcon />
          Facebook
        </Button>
      </div>
      <p
        className={`text-center text-xs text-muted transition-opacity duration-200 ${
          message ? "opacity-100" : "opacity-0"
        }`}
        role="status"
      >
        {message ?? " "}
      </p>
    </div>
  );
}
