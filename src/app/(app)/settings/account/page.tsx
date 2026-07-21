import { getProfile } from "@/app/(app)/settings/actions";
import { ProfilePanel } from "@/components/settings/profile-panel";

export default async function AccountSettingsPage() {
  const profile = await getProfile();
  return <ProfilePanel profile={profile} />;
}
