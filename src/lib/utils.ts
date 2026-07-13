import { clsx, type ClassValue } from "clsx"
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns"
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

export type PeriodPreset = "today" | "week" | "month" | "overall";

export type TxnDatePreset = PeriodPreset | "custom";

export const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "overall", label: "Overall" },
];

export function txnDateRange(
  preset: TxnDatePreset,
  custom?: { from: string; to: string }
): { start: string; end: string } {
  const now = new Date();
  if (preset === "today") {
    const d = format(now, "yyyy-MM-dd");
    return { start: d, end: d };
  }
  if (preset === "week") {
    return {
      start: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      end: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  }
  if (preset === "month") {
    return {
      start: format(startOfMonth(now), "yyyy-MM-dd"),
      end: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }
  if (preset === "overall") {
    return { start: "0000-01-01", end: format(now, "yyyy-MM-dd") };
  }
  return {
    start: custom?.from ?? format(startOfMonth(now), "yyyy-MM-dd"),
    end: custom?.to ?? format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

export function txnInRange(date: string, start: string, end: string) {
  return (date ?? "") >= start && (date ?? "") <= end;
}
