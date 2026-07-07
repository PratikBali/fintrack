import {
  UtensilsCrossed,
  Home,
  Car,
  Ticket,
  ShoppingCart,
  HeartPulse,
  Receipt,
  MoreHorizontal,
  Wallet,
} from "lucide-react";
import type { Category } from "./types";

export const categories: Category[] = [
  { name: "Food", icon: UtensilsCrossed },
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

/** Stable ids for built-in categories (seeded into user prefs on first load). */
export const DEFAULT_CATEGORY_OPTIONS = categories.map((c) => ({
  id: `default-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name: c.name,
}));

export function getCategoryIcon(name: string) {
  return categories.find((c) => c.name === name)?.icon ?? MoreHorizontal;
}
