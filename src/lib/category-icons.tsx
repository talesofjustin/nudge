import type { ComponentType, SVGProps } from "react";
import { HeartIcon, TagIcon, TrendingUpIcon, WalletIcon } from "@/components/icons/dashboard-icons";
import {
  CarIcon,
  DumbbellIcon,
  HomeIcon,
  LandmarkIcon,
  PlaneIcon,
  RefreshIcon,
  ShieldIcon,
  ShoppingCartIcon,
  UtensilsIcon,
} from "@/components/icons/category-icons";

// Maps the `categories.icon` column (see the initial schema migration and its
// default seed set) to the actual icon component. Add to this as new
// categories/icons are introduced — `TagIcon` is the fallback for unknown or
// user-picked-but-unmapped values.
export const CATEGORY_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  wallet: WalletIcon,
  car: CarIcon,
  utensils: UtensilsIcon,
  dumbbell: DumbbellIcon,
  shield: ShieldIcon,
  "trending-up": TrendingUpIcon,
  heart: HeartIcon,
  home: HomeIcon,
  "shopping-cart": ShoppingCartIcon,
  "refresh-cw": RefreshIcon,
  landmark: LandmarkIcon,
  plane: PlaneIcon,
};

export function getCategoryIcon(icon: string): ComponentType<SVGProps<SVGSVGElement>> {
  return CATEGORY_ICONS[icon] ?? TagIcon;
}
