"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { useTransactions } from "@/lib/transactions";

const compact = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function OverviewChart() {
  const { transactions } = useTransactions();

  const now = new Date();
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      name: d.toLocaleString("en-IN", { month: "short" }),
      total: 0,
    };
  });
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const t of transactions) {
    if (t.deleted || t.type !== "expense") continue;
    const bucket = byKey.get(t.date?.slice(0, 7));
    if (bucket) bucket.total += t.amount;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={buckets}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={70}
          tickFormatter={(value) => `₹${compact.format(value as number)}`}
        />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
