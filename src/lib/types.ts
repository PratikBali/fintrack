import type { LucideIcon } from "lucide-react";

export interface Transaction {
  id: string;
  name: string;
  email: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  avatar: string;
  category?: Category;
}

export interface Category {
  name: string;
  icon: LucideIcon;
}
