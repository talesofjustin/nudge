import type { ReactNode } from "react";
import { Sidebar } from "@/components/nav/sidebar";
import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/user-settings";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const [{ data: { user } }, settings] = await Promise.all([
    supabase.auth.getUser(),
    getUserSettings(),
  ]);

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar email={user?.email ?? ""} theme={settings.theme ?? "system"} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pt-10 pb-16">
        {children}
      </main>
    </div>
  );
}
