"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FilterChip } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { upsertUserSettings, type UserSettings } from "@/lib/user-settings";
import { getTimezoneOptions } from "@/lib/timezone";
import type { DecimalSeparator } from "@/lib/supabase/database.types";

function detectDecimalSeparator(): DecimalSeparator {
  const parts = new Intl.NumberFormat(navigator.language).formatToParts(1.1);
  const decimal = parts.find((p) => p.type === "decimal");
  return decimal?.value === "," ? "comma" : "period";
}

function detectTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function SettingsForm({ settings }: { settings: UserSettings }) {
  const [decimalSeparator, setDecimalSeparator] = useState<DecimalSeparator>(
    () => settings.decimalSeparator ?? detectDecimalSeparator(),
  );
  const [timezone, setTimezone] = useState<string>(
    () => settings.timezone ?? detectTimezone(),
  );
  const timezoneOptions = useMemo(() => getTimezoneOptions(), []);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const res = await upsertUserSettings({ decimalSeparator, timezone });

    setSaving(false);
    if (!res.success) {
      setError("Could not save your settings. Please try again.");
      return;
    }
    setSaved(true);
  }

  return (
    <Card className="flex max-w-lg flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Decimal separator</h2>
          <p className="mt-1 text-[13px] text-muted">
            Used when reading amounts from imported CSV files.
          </p>
        </div>
        <div className="flex gap-2">
          <FilterChip
            active={decimalSeparator === "period"}
            onClick={() => {
              setDecimalSeparator("period");
              setSaved(false);
            }}
          >
            1,234.56
          </FilterChip>
          <FilterChip
            active={decimalSeparator === "comma"}
            onClick={() => {
              setDecimalSeparator("comma");
              setSaved(false);
            }}
          >
            1.234,56
          </FilterChip>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Timezone</h2>
          <p className="mt-1 text-[13px] text-muted">
            Used to interpret dates from imported CSV files correctly.
          </p>
        </div>
        <SearchableSelect
          value={timezone}
          onValueChange={(value) => {
            setTimezone(value);
            setSaved(false);
          }}
          options={timezoneOptions}
          searchPlaceholder="Search timezones…"
        />
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {saved && <span className="text-[13px] text-mint">Saved.</span>}
      </div>
    </Card>
  );
}
