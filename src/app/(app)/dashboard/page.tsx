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
    <div className="flex flex-col gap-5">
      <HeroCard />
      <QuickActions />
      <StatTrio />
      <SpendingByCategory />
      <RecentTransactions />
    </div>
  );
}
