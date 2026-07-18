"use client";

import { useEffect, useState } from "react";
import { IconChip } from "@/components/ui/icon-chip";

const MESSAGE_SETS = {
  reading: ["Reading your file…", "Detecting columns…", "Almost ready…"],
  importing: ["Importing your transactions…", "Almost done…"],
  reviewing: ["Checking your import…"],
} as const;

export function ProcessingIndicator({ variant }: { variant: keyof typeof MESSAGE_SETS }) {
  const [index, setIndex] = useState(0);
  const messages = MESSAGE_SETS[variant];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <IconChip tone="violet" size={48}>
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </IconChip>
      <p className="text-[15px] font-medium text-foreground">{messages[index]}</p>
    </div>
  );
}
