import {
  UtensilsCrossed,
  Home,
  Car,
  Ticket,
  ShoppingCart,
  ShoppingBasket,
  Leaf,
  Apple,
  HeartPulse,
  Receipt,
  MoreHorizontal,
  Wallet,
  Coffee,
  Cylinder,
  createLucideIcon,
  type LucideIcon,
} from "lucide-react";
import type { Category, CategoryGroup } from "./types";

/**
 * Elephant icon — lucide ships no elephant, so this is a lucide-styled custom
 * one: a front-facing head with a domed crown, two ears, eyes and a trunk.
 */
export const Elephant = createLucideIcon("elephant", [
  ["path", { d: "M8 8C4 6 2 8.5 2 11.5c0 2.2 1.6 3.4 3.8 3.2", key: "ear-l" }],
  ["path", { d: "M16 8c4-2 6 .5 6 3.5 0 2.2-1.6 3.4-3.8 3.2", key: "ear-r" }],
  ["path", { d: "M8 8c0-3 8-3 8 0", key: "crown" }],
  ["path", { d: "M6 14.5c.5 2 1.5 3.3 2.8 4", key: "cheek-l" }],
  ["path", { d: "M18 14.5c-.5 2-1.5 3.3-2.8 4", key: "cheek-r" }],
  ["path", { d: "M12 10c-.8 2.5-.8 5.5 0 8 .6 1.9 2.4 2.3 3.4 1", key: "trunk" }],
  ["path", { d: "M9.8 16.6c-.4 1.4-1.1 2.4-2.1 3", key: "tusk-l" }],
  ["path", { d: "M14.2 16.6c.4 1.4 1.1 2.4 2.1 3", key: "tusk-r" }],
  ["circle", { cx: "9", cy: "11.8", r: ".6", key: "eye-l" }],
  ["circle", { cx: "15", cy: "11.8", r: ".6", key: "eye-r" }],
]);

export const categories: Category[] = [
  { name: "Tea", icon: Coffee },
  { name: "Food", icon: UtensilsCrossed },
  { name: "Grocery", icon: ShoppingBasket },
  { name: "Vegetables", icon: Leaf },
  { name: "Fruits", icon: Apple },
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
