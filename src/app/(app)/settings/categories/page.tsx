import { createClient } from "@/lib/supabase/server";
import { CategoriesManager } from "@/components/settings/categories-manager";

export default async function CategoriesSettingsPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, color, icon, kind")
    .order("sort_order", { ascending: true });

  return <CategoriesManager categories={categories ?? []} />;
}
