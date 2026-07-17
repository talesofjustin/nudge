"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CategoryBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { CATEGORY_COLOR_SWATCHES } from "@/lib/category-colors";

export function CategoryPicker({
  categories,
  value,
  onChange,
  onCreateCategory,
}: {
  categories: CategoryInfo[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  onCreateCategory: (name: string, color: string, icon: string) => Promise<CategoryInfo | null>;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLOR_SWATCHES[0]);
  const [icon, setIcon] = useState(Object.keys(CATEGORY_ICONS)[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = categories.find((c) => c.id === value) ?? null;

  function reset() {
    setCreating(false);
    setName("");
    setColor(CATEGORY_COLOR_SWATCHES[0]);
    setIcon(Object.keys(CATEGORY_ICONS)[0]);
    setError(null);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const created = await onCreateCategory(name.trim(), color, icon);
    setSubmitting(false);
    if (!created) {
      setError("Could not create category.");
      return;
    }
    onChange(created.id);
    setOpen(false);
    reset();
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className="cursor-pointer rounded-full transition-opacity hover:opacity-80">
          <CategoryBadge category={current} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        {!creating ? (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="flex items-center rounded-xl px-2 py-2 text-left hover:bg-canvas"
            >
              <CategoryBadge category={null} />
            </button>

            <div className="max-h-64 overflow-y-auto">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center rounded-xl px-2 py-2 text-left hover:bg-canvas"
                >
                  <CategoryBadge category={c} />
                </button>
              ))}
            </div>

            <div className="mt-1 border-t border-border pt-2">
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full rounded-xl px-2 py-2 text-left text-[13px] font-medium text-violet-600 hover:bg-canvas"
              >
                + New category
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pets"
              autoFocus
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted">Color</span>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setColor(swatch)}
                    aria-label={swatch}
                    className={`h-6 w-6 rounded-full transition-transform ${
                      color === swatch ? "scale-110 ring-2 ring-offset-2 ring-offset-surface" : ""
                    }`}
                    style={{ backgroundColor: swatch, ["--tw-ring-color" as string]: swatch }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted">Icon</span>
              <div className="grid grid-cols-6 gap-2">
                {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    aria-label={key}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                      icon === key
                        ? "border-violet-400 bg-canvas"
                        : "border-transparent hover:bg-canvas"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-foreground" />
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-[12px] text-danger" role="alert">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={reset}
                className="text-[13px] font-medium text-muted hover:text-foreground"
              >
                Back
              </button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={submitting}
                className="h-9 px-4 text-[13px]"
              >
                {submitting ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
