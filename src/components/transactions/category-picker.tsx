"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/pill";
import { CategoryBadge, type CategoryInfo } from "@/components/transactions/category-badge";
import { PencilIcon } from "@/components/icons/dashboard-icons";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { CATEGORY_COLOR_SWATCHES } from "@/lib/category-colors";
import type { CategoryKind } from "@/lib/supabase/database.types";

type Mode = { view: "list" } | { view: "create" } | { view: "edit"; category: CategoryInfo };

export function CategoryPicker({
  categories,
  value,
  onChange,
  onCreateCategory,
  onUpdateCategory,
  emptyLabel,
  unreviewed = false,
}: {
  categories: CategoryInfo[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  onCreateCategory: (name: string, color: string, icon: string, kind: CategoryKind) => Promise<CategoryInfo | null>;
  onUpdateCategory?: (
    id: string,
    updates: { name: string; color: string; icon: string; kind: CategoryKind },
  ) => Promise<void>;
  emptyLabel?: string;
  unreviewed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>({ view: "list" });
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLOR_SWATCHES[0]);
  const [icon, setIcon] = useState(Object.keys(CATEGORY_ICONS)[0]);
  const [kind, setKind] = useState<CategoryKind>("spending");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = categories.find((c) => c.id === value) ?? null;

  function resetForm() {
    setName("");
    setColor(CATEGORY_COLOR_SWATCHES[0]);
    setIcon(Object.keys(CATEGORY_ICONS)[0]);
    setKind("spending");
    setError(null);
  }

  function startCreate() {
    resetForm();
    setMode({ view: "create" });
  }

  function startEdit(category: CategoryInfo) {
    setName(category.name);
    setColor(category.color);
    setIcon(category.icon);
    setKind(category.kind);
    setError(null);
    setMode({ view: "edit", category });
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const created = await onCreateCategory(name.trim(), color, icon, kind);
    setSubmitting(false);
    if (!created) {
      setError("Could not create category.");
      return;
    }
    onChange(created.id);
    setOpen(false);
    setMode({ view: "list" });
  }

  async function handleSaveEdit() {
    if (mode.view !== "edit" || !name.trim() || !onUpdateCategory) return;
    setSubmitting(true);
    setError(null);
    await onUpdateCategory(mode.category.id, { name: name.trim(), color, icon, kind });
    setSubmitting(false);
    setMode({ view: "list" });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setMode({ view: "list" });
          resetForm();
        }
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className="cursor-pointer rounded-full transition-opacity hover:opacity-80">
          <CategoryBadge category={current} emptyLabel={emptyLabel} unreviewed={unreviewed} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {mode.view === "list" ? (
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

            <div className="themed-scrollbar grid max-h-72 grid-cols-2 gap-1 overflow-y-auto">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="group flex items-center gap-0.5 rounded-xl pr-1 hover:bg-canvas"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                    className="min-w-0 flex-1 px-1.5 py-2 text-left"
                  >
                    <CategoryBadge category={c} className="max-w-full" />
                  </button>
                  {onUpdateCategory && (
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      title={`Edit ${c.name}`}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-2 opacity-0 transition-opacity hover:bg-surface hover:text-foreground group-hover:opacity-100"
                    >
                      <PencilIcon className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-1 border-t border-border pt-2">
              <button
                type="button"
                onClick={startCreate}
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
                onClick={() => setMode({ view: "list" })}
                className="text-[13px] font-medium text-muted hover:text-foreground"
              >
                Back
              </button>
              <Button
                type="button"
                onClick={mode.view === "create" ? handleCreate : handleSaveEdit}
                disabled={submitting}
                className="h-9 px-4 text-[13px]"
              >
                {submitting ? (mode.view === "create" ? "Creating…" : "Saving…") : mode.view === "create" ? "Create" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
