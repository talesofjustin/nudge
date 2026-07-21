"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/settings/account", label: "Account" },
  { href: "/settings/preferences", label: "Preferences" },
  { href: "/settings/appearance", label: "Appearance" },
  { href: "/settings/accounts", label: "Accounts" },
  { href: "/settings/books", label: "Books" },
  { href: "/settings/categories", label: "Categories" },
  { href: "/settings/rules", label: "Rules" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-44 shrink-0 flex-col gap-0.5">
      {SECTIONS.map((s) => {
        const active = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
              active ? "bg-surface text-foreground shadow-soft" : "text-muted hover:bg-surface/60 hover:text-foreground"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
