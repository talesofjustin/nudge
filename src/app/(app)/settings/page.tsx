import { getUserSettings } from "@/lib/user-settings";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const settings = await getUserSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-[15px] text-muted">
          Locale preferences used when importing CSV files.
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
