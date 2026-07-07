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

export function getCategoryIcon(name: string) {
  return categories.find((c) => c.name === name)?.icon ?? MoreHorizontal;
}
