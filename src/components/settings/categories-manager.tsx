"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FilterChip } from "@/components/ui/pill";
import { CategoryBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { CATEGORY_COLOR_SWATCHES } from "@/lib/category-colors";
import { createCategory, updateCategory, deleteCategory } from "@/app/(app)/transactions/actions";
import type { CategoryKind } from "@/lib/supabase/database.types";

function EditPopover({
  category,
  onSave,
}: {
  category: CategoryInfo;
  onSave: (updates: { name: string; color: string; icon: string; kind: CategoryKind }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [icon, setIcon] = useState(category.icon);
  const [kind, setKind] = useState<CategoryKind>(category.kind);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setName(category.name);
          setColor(category.color);
          setIcon(category.icon);
          setKind(category.kind);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className="cursor-pointer rounded-full transition-opacity hover:opacity-80">
          <CategoryBadge category={category} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="flex flex-col gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">Kind</span>
            <div className="flex gap-2">
              <FilterChip active={kind === "spending"} onClick={() => setKind("spending")}>
                Spending
              </FilterChip>
              <FilterChip active={kind === "saving"} onClick={() => setKind("saving")}>
                Saving
              </FilterChip>
            </div>
          </div>

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
                    icon === key ? "border-violet-400 bg-canvas" : "border-transparent hover:bg-canvas"
                  }`}
                >
                  <Icon className="h-4 w-4 text-foreground" />
                </button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            className="mt-1 h-9 w-full text-[13px]"
            onClick={() => {
              if (!name.trim()) return;
              onSave({ name: name.trim(), color, icon, kind });
              setOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CategoriesManager({ categories: initial }: { categories: CategoryInfo[] }) {
  const [categories, setCategories] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLOR_SWATCHES[0]);
  const [icon, setIcon] = useState(Object.keys(CATEGORY_ICONS)[0]);
  const [kind, setKind] = useState<CategoryKind>("spending");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function resetCreateForm() {
    setCreating(false);
    setName("");
    setColor(CATEGORY_COLOR_SWATCHES[0]);
    setIcon(Object.keys(CATEGORY_ICONS)[0]);
    setKind("spending");
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSubmitting(true);
    const created = await createCategory(name.trim(), color, icon, kind);
    setSubmitting(false);
    if (created) setCategories((prev) => [...prev, created]);
    resetCreateForm();
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Categories</h2>
          <p className="mt-1 text-[13px] text-muted">What transactions are for.</p>
        </div>
        {!creating && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCreating(true)}
            className="h-9 shrink-0 px-4 text-[13.5px]"
          >
            New category
          </Button>
        )}
      </div>

      {creating && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-canvas p-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="max-w-xs" />
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">Kind</span>
            <div className="flex gap-2">
              <FilterChip active={kind === "spending"} onClick={() => setKind("spending")}>
                Spending
              </FilterChip>
              <FilterChip active={kind === "saving"} onClick={() => setKind("saving")}>
                Saving
              </FilterChip>
            </div>
          </div>
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
            <div className="grid grid-cols-8 gap-2">
              {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  aria-label={key}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                    icon === key ? "border-violet-400 bg-surface" : "border-transparent hover:bg-surface"
                  }`}
                >
                  <Icon className="h-4 w-4 text-foreground" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" onClick={handleCreate} disabled={submitting} className="h-9 px-4 text-[13px]">
              {submitting ? "Adding…" : "Add"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetCreateForm} className="h-9 px-3 text-[13px]">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <p className="text-[13px] text-muted-2">No categories yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <EditPopover
                category={c}
                onSave={async (updates) => {
                  setCategories((prev) => prev.map((cat) => (cat.id === c.id ? { ...cat, ...updates } : cat)));
                  await updateCategory(c.id, updates);
                }}
              />
              {confirmingId === c.id ? (
                <span className="flex items-center gap-1 text-[11.5px]">
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className="font-medium text-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setCategories((prev) => prev.filter((cat) => cat.id !== c.id));
                      await deleteCategory(c.id);
                    }}
                    className="font-medium text-danger hover:underline"
                  >
                    Confirm
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingId(c.id)}
                  className="text-[11.5px] font-medium text-muted-2 hover:text-danger"
                  aria-label={`Delete ${c.name}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
