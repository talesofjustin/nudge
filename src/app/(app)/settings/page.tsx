import { createClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/user-settings";
import { getProfile, getAccountsForSettings, getBooksForSettings } from "@/app/(app)/settings/actions";
import {
  getKnownRecipients,
  getRecipientBookRules,
  getRecipientCategoryRules,
} from "@/app/(app)/transactions/actions";
import { SettingsForm } from "@/components/settings/settings-form";
import { ProfilePanel } from "@/components/settings/profile-panel";
import { AppearancePanel } from "@/components/settings/appearance-panel";
import { AccountsManager } from "@/components/settings/accounts-manager";
import { BooksManager } from "@/components/settings/books-manager";
import { RulesManager } from "@/components/settings/rules-manager";
import { CategoriesManager } from "@/components/settings/categories-manager";
import { KnownRecipientsManager } from "@/components/settings/known-recipients-manager";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [
    settings,
    profile,
    accounts,
    books,
    { data: categories },
    bookRules,
    categoryRules,
    knownRecipients,
  ] = await Promise.all([
    getUserSettings(),
    getProfile(),
    getAccountsForSettings(),
    getBooksForSettings(),
    supabase.from("categories").select("id, name, color, icon").order("created_at", { ascending: true }),
    getRecipientBookRules(),
    getRecipientCategoryRules(),
    getKnownRecipients(),
  ]);

  const showBookFeature = books.length > 1;

  return (
    <div className="flex flex-col gap-6">
      {/* pl-6 matches Card's own left padding (p-6) so the title's first
          character lines up with card content's first character below. */}
      <div className="pl-6">
        <h1 className="text-[22px] font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-[15px] text-muted">Your account, accounts, and how Nudge behaves.</p>
      </div>

      <ProfilePanel profile={profile} />
      <SettingsForm settings={settings} />
      <AppearancePanel initialTheme={settings.theme ?? "system"} />
      <AccountsManager accounts={accounts} books={books} />
      <BooksManager books={books} />
      <RulesManager
        bookRules={bookRules}
        categoryRules={categoryRules}
        books={books}
        categories={categories ?? []}
        showBookFeature={showBookFeature}
      />
      <CategoriesManager categories={categories ?? []} />
      <KnownRecipientsManager knownRecipients={knownRecipients} />
    </div>
  );
}
