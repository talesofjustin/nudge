import { getAccountsForSettings, getBooksForSettings } from "@/app/(app)/settings/actions";
import { AccountsManager } from "@/components/settings/accounts-manager";

export default async function AccountsSettingsPage() {
  const [accounts, books] = await Promise.all([getAccountsForSettings(), getBooksForSettings()]);
  return <AccountsManager accounts={accounts} books={books} />;
}
