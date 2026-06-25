"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@/lib/auth";
import { useTransactions } from "@/lib/transactions";
import { useLedger } from "@/lib/ledger";
import { computeGroupBalances, useGroupExpenses, useGroups } from "@/lib/groups";
import { getCategoryIcon } from "@/lib/data";
import { cn, formatCurrency } from "@/lib/utils";
import type { Group } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Period = "month" | "3m" | "6m" | "year" | "all";

const PERIODS: { id: Period; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" },
  { id: "year", label: "This year" },
  { id: "all", label: "All" },
];

const compact = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const GREEN = "#16a34a";
const RED = "#ef4444";

function periodStart(p: Period): string {
  const now = new Date();
  if (p === "all") return "0000-01-01";
  if (p === "year") return `${now.getFullYear()}-01-01`;
  const back = p === "month" ? 0 : p === "3m" ? 2 : 5;
  const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function Kpi({
  title,
  value,
  hint,
  tone,
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
}) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div
          className={cn(
            "text-xl font-bold sm:text-2xl",
            tone === "good" && "text-green-600",
            tone === "bad" && "text-red-600"
          )}
        >
          {value}
        </div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function GroupReportRow({ group, uid }: { group: Group; uid?: string }) {
  const expenses = useGroupExpenses(group.id);
  const members = useMemo(
    () => Array.from(new Map(group.members.map((m) => [m.uid, m])).values()),
    [group.members]
  );
  const { net } = useMemo(
    () => computeGroupBalances(members, expenses),
    [members, expenses]
  );
  const total = useMemo(
    () =>
      expenses.reduce(
        (s, e) => (e.deleted || e.type === "settlement" ? s : s + e.amount),
        0
      ),
    [expenses]
  );
  const mine = uid ? net[uid] ?? 0 : 0;
  const settled = Math.abs(mine) < 0.01;

  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{group.name}</p>
        <p className="text-xs text-muted-foreground">
          {members.length} members · {formatCurrency(total)} spent
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 font-medium",
          settled
            ? "text-muted-foreground"
            : mine > 0
              ? "text-green-600"
              : "text-red-600"
        )}
      >
        {settled
          ? "settled"
          : mine > 0
            ? `owed ${formatCurrency(mine)}`
            : `owe ${formatCurrency(-mine)}`}
      </span>
    </div>
  );
}

export function ReportsView() {
  const { user } = useAuth();
  const { transactions, loading } = useTransactions();
  const { totals: ledgerTotals } = useLedger();
  const { groups } = useGroups();
  const [period, setPeriod] = useState<Period>("6m");

  const start = periodStart(period);

  const inPeriod = useMemo(
    () => transactions.filter((t) => !t.deleted && (t.date ?? "") >= start),
    [transactions, start]
  );

  const { income, expense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of inPeriod) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense };
  }, [inPeriod]);

  const net = income - expense;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : null;

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of inPeriod) {
      if (t.type !== "expense") continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    const rows = Array.from(map, ([category, amount]) => ({ category, amount }));
    rows.sort((a, b) => b.amount - a.amount);
    return rows;
  }, [inPeriod]);

  const trend = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        name: d.toLocaleString("en-IN", { month: "short" }),
        income: 0,
        expense: 0,
      };
    });
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const t of transactions) {
      if (t.deleted) continue;
      const b = byKey.get((t.date ?? "").slice(0, 7));
      if (!b) continue;
      if (t.type === "income") b.income += t.amount;
      else b.expense += t.amount;
    }
    return buckets;
  }, [transactions]);

  const ledgerNet = ledgerTotals.willGet - ledgerTotals.willGive;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={period === p.id ? "default" : "outline"}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi title="Income" value={formatCurrency(income)} tone="good" />
        <Kpi title="Expenses" value={formatCurrency(expense)} tone="bad" />
        <Kpi
          title="Net"
          value={formatCurrency(net)}
          tone={net >= 0 ? "good" : "bad"}
          hint="Income − expenses"
        />
        <Kpi
          title="Savings rate"
          value={savingsRate === null ? "—" : `${savingsRate}%`}
          hint="Net ÷ income"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
            <CardDescription>
              Where your money went this period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No spending in this period.
              </p>
            ) : (
              <div className="space-y-3">
                {categories.map(({ category, amount }) => {
                  const Icon = getCategoryIcon(category);
                  const pct = expense > 0 ? (amount / expense) * 100 : 0;
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{category}</span>
                        <span className="ml-auto shrink-0 font-medium">
                          {formatCurrency(amount)}
                        </span>
                        <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income vs Expense</CardTitle>
            <CardDescription>Last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trend}>
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
                  width={56}
                  tickFormatter={(v) => `₹${compact.format(v as number)}`}
                />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v))}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Legend />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill={GREEN}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill={RED}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ledger summary</CardTitle>
            <CardDescription>Current dues across contacts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">You&apos;ll Get</span>
              <span className="font-medium text-green-600">
                {formatCurrency(ledgerTotals.willGet)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">You&apos;ll Give</span>
              <span className="font-medium text-red-600">
                {formatCurrency(ledgerTotals.willGive)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="font-medium">Net position</span>
              <span
                className={cn(
                  "font-semibold",
                  ledgerNet >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {formatCurrency(ledgerNet)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Groups summary</CardTitle>
            <CardDescription>
              {groups.length} group{groups.length === 1 ? "" : "s"} · your net in
              each.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No groups yet.</p>
            ) : (
              <div className="divide-y">
                {groups.map((g) => (
                  <GroupReportRow key={g.id} group={g} uid={user?.uid} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
