import { getUserSettings } from "@/lib/user-settings";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function PreferencesSettingsPage() {
  const settings = await getUserSettings();
  return <SettingsForm settings={settings} />;
}
