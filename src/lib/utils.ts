import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number) {
  return inrFormatter.format(amount ?? 0);
}

/** Newest first: by date (ISO, day) desc, tie-broken by createdAt (precise) desc. */
export function byNewestFirst(
  a: { date?: string; createdAt?: number },
  b: { date?: string; createdAt?: number }
) {
  const d = (b.date ?? "").localeCompare(a.date ?? "");
  if (d !== 0) return d;
  return (b.createdAt ?? 0) - (a.createdAt ?? 0);
}
