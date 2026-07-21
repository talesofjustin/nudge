"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { type CategoryInfo } from "@/components/transactions/category-badge";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { CATEGORY_COLOR_SWATCHES } from "@/lib/category-colors";
import { createCategory, updateCategory, deleteCategory, reorderCategories } from "@/app/(app)/transactions/actions";
import type { CategoryKind } from "@/lib/supabase/database.types";

type Category = CategoryInfo;

function GripIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <circle cx="5" cy="3" r="1.2" />
      <circle cx="11" cy="3" r="1.2" />
      <circle cx="5" cy="8" r="1.2" />
      <circle cx="11" cy="8" r="1.2" />
      <circle cx="5" cy="13" r="1.2" />
      <circle cx="11" cy="13" r="1.2" />
    </svg>
  );
}

function ColorPopover({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Change color"
          className="h-5 w-5 shrink-0 rounded-full transition-transform hover:scale-110"
          style={{ backgroundColor: color }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto" align="start">
        <div className="flex max-w-48 flex-wrap gap-2">
          {CATEGORY_COLOR_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => {
                onChange(swatch);
                setOpen(false);
              }}
              aria-label={swatch}
              className={`h-6 w-6 rounded-full transition-transform ${
                color === swatch ? "scale-110 ring-2 ring-offset-2 ring-offset-surface" : ""
              }`}
              style={{ backgroundColor: swatch, ["--tw-ring-color" as string]: swatch }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function IconPopover({ icon, onChange }: { icon: string; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  const Icon = CATEGORY_ICONS[icon];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Change icon"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-foreground"
        >
          {Icon && <Icon className="h-4 w-4" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto" align="start">
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(CATEGORY_ICONS).map(([key, IconOption]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
              aria-label={key}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                icon === key ? "border-violet-400 bg-canvas" : "border-transparent hover:bg-canvas"
              }`}
            >
              <IconOption className="h-4 w-4 text-foreground" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NamePopover({ name, onSave }: { name: string; onSave: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setValue(name);
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className="min-w-0 truncate text-left text-[13.5px] font-medium text-foreground hover:underline">
          {name}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start">
        <Input label="Name" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        <Button
          type="button"
          className="mt-3 h-8 w-full text-[13px]"
          onClick={() => {
            if (value.trim()) onSave(value.trim());
            setOpen(false);
          }}
        >
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function KindToggle({ kind, onChange }: { kind: CategoryKind; onChange: (kind: CategoryKind) => void }) {
  return (
    <div className="flex shrink-0 gap-1 rounded-full bg-canvas p-0.5">
      {(["spending", "saving"] as const).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize transition-colors ${
            kind === k ? "bg-ink-solid text-white" : "text-muted hover:text-foreground"
          }`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

function CategoryRow({
  category,
  dragging,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  category: Category;
  dragging: boolean;
  onUpdate: (updates: Partial<Omit<Category, "id">>) => void;
  onDelete: () => Promise<void>;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-3 rounded-xl px-2 py-2 transition-opacity ${dragging ? "opacity-40" : ""}`}
    >
      <span className="flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-muted-2 active:cursor-grabbing">
        <GripIcon className="h-3.5 w-3.5" />
      </span>
      <ColorPopover color={category.color} onChange={(color) => onUpdate({ color })} />
      <IconPopover icon={category.icon} onChange={(icon) => onUpdate({ icon })} />
      <div className="min-w-0 flex-1">
        <NamePopover name={category.name} onSave={(name) => onUpdate({ name })} />
      </div>
      <KindToggle kind={category.kind} onChange={(kind) => onUpdate({ kind })} />
      <ConfirmDeleteButton onConfirm={onDelete} />
    </div>
  );
}

function NewCategoryRow({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string, color: string, icon: string, kind: CategoryKind) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLOR_SWATCHES[0]);
  const [icon, setIcon] = useState(Object.keys(CATEGORY_ICONS)[0]);
  const [kind, setKind] = useState<CategoryKind>("spending");
  const [submitting, setSubmitting] = useState(false);

  async function commit() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    await onCreate(name.trim(), color, icon, kind);
    setSubmitting(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-canvas px-2 py-2">
      <span className="w-4 shrink-0" />
      <ColorPopover color={color} onChange={setColor} />
      <IconPopover icon={icon} onChange={setIcon} />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void commit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Category name"
        autoFocus
        className="h-8 min-w-0 flex-1"
      />
      <KindToggle kind={kind} onChange={setKind} />
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onCancel} className="text-[12px] font-medium text-muted hover:text-foreground">
          Cancel
        </button>
        <Button type="button" className="h-7 px-3 text-[12px]" disabled={!name.trim() || submitting} onClick={commit}>
          {submitting ? "Adding…" : "Add"}
        </Button>
      </div>
    </div>
  );
}

export function CategoriesManager({ categories: initial }: { categories: Category[] }) {
  const [categories, setCategories] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  async function handleCreate(name: string, color: string, icon: string, kind: CategoryKind) {
    const created = await createCategory(name, color, icon, kind);
    if (created) setCategories((prev) => [...prev, created]);
    setCreating(false);
  }

  function handleUpdate(id: string, updates: Partial<Omit<Category, "id">>) {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    void updateCategory(id, updates);
  }

  async function handleDelete(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    await deleteCategory(id);
  }

  function handleDrop(overId: string) {
    if (!draggedId || draggedId === overId) {
      setDraggedId(null);
      return;
    }
    const fromIdx = categories.findIndex((c) => c.id === draggedId);
    const toIdx = categories.findIndex((c) => c.id === overId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedId(null);
      return;
    }
    const next = [...categories];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setCategories(next);
    setDraggedId(null);
    void reorderCategories(next.map((c) => c.id));
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Categories</h2>
          <p className="mt-1 text-[13px] text-muted">
            What transactions are for. Drag to reorder — the order shown here is used everywhere
            categories are listed.
          </p>
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

      <div className="flex flex-col gap-0.5">
        {creating && <NewCategoryRow onCreate={handleCreate} onCancel={() => setCreating(false)} />}

        {categories.length === 0 && !creating ? (
          <p className="text-[13px] text-muted-2">No categories yet.</p>
        ) : (
          categories.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              dragging={draggedId === c.id}
              onUpdate={(updates) => handleUpdate(c.id, updates)}
              onDelete={() => handleDelete(c.id)}
              onDragStart={() => setDraggedId(c.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(c.id)}
              onDragEnd={() => setDraggedId(null)}
            />
          ))
        )}
      </div>
    </Card>
  );
}
