"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { WalletIcon, TagIcon } from "@/components/icons/dashboard-icons";
import { UserIcon, SlidersIcon, SunIcon, BookIcon, ListCheckIcon } from "@/components/icons/settings-icons";

const SECTIONS: {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { href: "/settings/account", label: "Account", icon: UserIcon },
  { href: "/settings/preferences", label: "Preferences", icon: SlidersIcon },
  { href: "/settings/appearance", label: "Appearance", icon: SunIcon },
  { href: "/settings/accounts", label: "Accounts", icon: WalletIcon },
  { href: "/settings/books", label: "Books", icon: BookIcon },
  { href: "/settings/categories", label: "Categories", icon: TagIcon },
  { href: "/settings/rules", label: "Rules", icon: ListCheckIcon },
];

// Mirrors the main Sidebar's nav item styling (item height, type scale,
// spacing, icon usage, and the solid-ink active pill) so this reads as a
// nested level of the same system instead of a separate component.
export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-52 shrink-0 flex-col gap-1">
      {SECTIONS.map((s) => {
        const active = pathname === s.href;
        const Icon = s.icon;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[14px] font-medium transition-colors ${
              active ? "bg-ink-solid text-white" : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
