"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { logout } from "@/app/logout/actions";
import { Wordmark } from "@/components/ui/wordmark";
import {
  HeartIcon,
  SettingsIcon,
  TargetIcon,
  UploadIcon,
} from "@/components/icons/dashboard-icons";
import { GridIcon, ListIcon } from "@/components/icons/nav-icons";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: GridIcon },
  { href: "/import", label: "Import", icon: UploadIcon },
  { href: "/transactions", label: "Transactions", icon: ListIcon },
  { href: "/budget", label: "Budget", icon: TargetIcon },
  { href: "/wishlist", label: "Wishlist", icon: HeartIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col px-4 py-6 sm:flex">
      <div className="px-2.5">
        <Wordmark />
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href) ?? false;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[14px] font-medium transition-colors ${
                active
                  ? "bg-ink-solid text-white"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Extra bottom clearance: Next.js's dev-mode indicator badge floats
          over this corner and would otherwise overlap the button. */}
      <form action={logout} className="mt-auto px-3.5 pb-10">
        <button
          type="submit"
          className="text-[13px] font-medium text-muted transition-colors hover:text-foreground"
        >
          Log out
        </button>
      </form>
    </aside>
  );
}
