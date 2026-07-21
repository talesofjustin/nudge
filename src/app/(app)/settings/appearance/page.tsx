import { getUserSettings } from "@/lib/user-settings";
import { AppearancePanel } from "@/components/settings/appearance-panel";

export default async function AppearanceSettingsPage() {
  const settings = await getUserSettings();
  return <AppearancePanel initialTheme={settings.theme ?? "system"} />;
}
