import {
  UtensilsCrossed,
  Home,
  Car,
  Ticket,
  ShoppingCart,
  ShoppingBasket,
  Leaf,
  HeartPulse,
  Receipt,
  MoreHorizontal,
  Wallet,
  Coffee,
  Cylinder,
  type LucideIcon,
} from "lucide-react";
import type { Category, CategoryGroup } from "./types";

export const categories: Category[] = [
  { name: "Tea", icon: Coffee },
  { name: "Food", icon: UtensilsCrossed },
  { name: "Grocery", icon: ShoppingBasket },
  { name: "Vegetables", icon: Leaf },
  { name: "Rent", icon: Home },
  { name: "Transport", icon: Car },
  { name: "Entertainment", icon: Ticket },
  { name: "Shopping", icon: ShoppingCart },
  { name: "Health", icon: HeartPulse },
  { name: "Recharge and Bills", icon: Receipt },
  { name: "Income", icon: Wallet },
  { name: "Other", icon: MoreHorizontal },
];

export const INCOME_CATEGORY = "Income";

/** Pre-selected + first-listed category in the add-transaction form. */
export const DEFAULT_CATEGORY = "Tea";

/** Always listed last in the category dropdown. */
export const OTHER_CATEGORY = "Other";

/** Icons for categories that aren't seeded defaults (matched case-insensitively). */
const EXTRA_CATEGORY_ICONS: Record<string, LucideIcon> = {
  gas: Cylinder,
};

/** Toggle options for classifying a category. */
export const CATEGORY_GROUPS = [
  { id: "consumable", label: "Consumable" },
  { id: "material", label: "Material" },
] as const;

/** Names treated as consumable when a category has no explicit group (case-insensitive). */
const CONSUMABLE_CATEGORY_NAMES = new Set([
  "tea",
  "food",
  "grocery",
  "groceries",
  "vegetable",
  "vegetables",
  "fruit",
  "fruits",
]);

/** Consumable vs material for a category — honours an explicit group, else infers by name. */
export function resolveCategoryGroup(cat: {
  name: string;
  group?: CategoryGroup;
}): CategoryGroup {
  if (cat.group) return cat.group;
  return CONSUMABLE_CATEGORY_NAMES.has((cat.name ?? "").trim().toLowerCase())
    ? "consumable"
    : "material";
}

/** Stable ids for built-in categories (seeded into user prefs on first load). */
export const DEFAULT_CATEGORY_OPTIONS = categories.map((c) => ({
  id: `default-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name: c.name,
  group: resolveCategoryGroup({ name: c.name }),
}));

export function getCategoryIcon(name: string) {
  const key = (name ?? "").trim().toLowerCase();
  return (
    categories.find((c) => c.name.toLowerCase() === key)?.icon ??
    EXTRA_CATEGORY_ICONS[key] ??
    MoreHorizontal
  );
}
