import type { ReactNode } from "react";
import { Sidebar } from "@/components/nav/sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pt-10 pb-16">
        {children}
      </main>
    </div>
  );
}
