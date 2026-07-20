"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateDisplayName, type ProfileData } from "@/app/(app)/settings/actions";

export function ProfilePanel({ profile }: { profile: ProfileData }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await updateDisplayName(displayName);
    setSaving(false);
    if (res.success) setSaved(true);
  }

  return (
    <Card className="flex max-w-lg flex-col gap-5">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Profile</h2>
        <p className="mt-1 text-[13px] text-muted">Your account details.</p>
      </div>

      <Input label="Email" value={profile.email} disabled className="opacity-70" />

      <div className="flex items-end gap-3">
        <Input
          label="Display name"
          placeholder="Add a name"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setSaved(false);
          }}
          className="max-w-xs"
        />
        <Button type="button" variant="secondary" onClick={handleSave} disabled={saving} className="h-9 px-4 text-[13px]">
          {saving ? "Saving…" : "Save"}
        </Button>
        {saved && <span className="text-[13px] text-mint">Saved.</span>}
      </div>
    </Card>
  );
}
