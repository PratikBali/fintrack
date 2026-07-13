"use client";

import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { format, getHours } from "date-fns";

import { useTransactions } from "@/lib/transactions";
import { txnDateRange, txnInRange, type PeriodPreset } from "@/lib/utils";

const compact = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function buildBuckets(preset: PeriodPreset, range: { start: string; end: string }) {
  const now = new Date();

  if (preset === "today") {
    return Array.from({ length: 24 }, (_, h) => ({
      key: String(h),
      name: h % 3 === 0 ? `${h}:00` : "",
      total: 0,
    }));
  }

  if (preset === "week") {
    const start = new Date(range.start);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        key: format(d, "yyyy-MM-dd"),
        name: format(d, "EEE"),
        total: 0,
      };
    });
  }

  if (preset === "month") {
    const start = new Date(range.start);
    const end = new Date(range.end);
    const days = end.getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), i + 1);
      return {
        key: format(d, "yyyy-MM-dd"),
        name: (i + 1) % 5 === 0 || i === 0 ? String(i + 1) : "",
        total: 0,
      };
    });
  }

  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      name: d.toLocaleString("en-IN", { month: "short" }),
      total: 0,
    };
  });
}

export function OverviewChart({ preset }: { preset: PeriodPreset }) {
  const { transactions } = useTransactions();
  const range = useMemo(() => txnDateRange(preset), [preset]);

  const buckets = useMemo(() => {
    const b = buildBuckets(preset, range);
    const byKey = new Map(b.map((x) => [x.key, x]));

    for (const t of transactions) {
      if (t.deleted || t.type !== "expense") continue;

      if (preset === "overall") {
        const bucket = byKey.get(t.date?.slice(0, 7));
        if (bucket) bucket.total += t.amount;
        continue;
      }

      if (!txnInRange(t.date, range.start, range.end)) continue;

      if (preset === "today") {
        const hour = getHours(t.createdAt ? new Date(t.createdAt) : new Date());
        const bucket = byKey.get(String(hour));
        if (bucket) bucket.total += t.amount;
      } else {
        const bucket = byKey.get(t.date);
        if (bucket) bucket.total += t.amount;
      }
    }

    return b;
  }, [transactions, preset, range]);

  return (
    <div className="h-[260px] w-full min-w-0 sm:h-[350px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={buckets}
          margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
        >
          <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(value) => `₹${compact.format(value as number)}`}
          />
          <Bar
            dataKey="total"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
