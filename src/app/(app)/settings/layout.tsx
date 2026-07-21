import type { ReactNode } from "react";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      {/* pl-6 matches Card's own left padding (p-6) so the title's first
          character lines up with card content's first character below. */}
      <div className="pl-6">
        <h1 className="text-[22px] font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-[15px] text-muted">Your account, accounts, and how Nudge behaves.</p>
      </div>

      <div className="flex items-start gap-8">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
