import { logout } from "@/app/logout/actions";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/wordmark";
import { HeroCard } from "@/components/dashboard/hero-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatTrio } from "@/components/dashboard/stat-trio";
import { SpendingByCategory } from "@/components/dashboard/spending-by-category";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";

// Design shell only — hardcoded placeholder data, no data layer yet.
// TODO: wire up accounts/transactions/labels/budgets and swap every
// hardcoded value in the components below for the real thing.
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Wordmark />
        <form action={logout}>
          <Button variant="ghost" type="submit" className="h-9 px-4 text-[13px]">
            Log out
          </Button>
        </form>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-6 pb-16">
        <HeroCard />
        <QuickActions />
        <StatTrio />
        <SpendingByCategory />
        <RecentTransactions />
      </main>
    </div>
  );
}
