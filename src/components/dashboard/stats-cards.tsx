"use client";

import { Wallet, CreditCard, Landmark, CalendarClock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactions } from "@/lib/transactions";
import { formatCurrency } from "@/lib/utils";

export function StatsCards() {
  const { transactions } = useTransactions();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  let income = 0;
  let expenses = 0;
  let monthSpending = 0;

  for (const t of transactions) {
    if (t.deleted) continue;
    if (t.type === "income") {
      income += t.amount;
    } else {
      expenses += t.amount;
      if (t.date?.startsWith(currentMonth)) monthSpending += t.amount;
    }
  }

  const balance = income - expenses;

  const cards = [
    {
      title: "Total Income",
      icon: Wallet,
      value: formatCurrency(income),
      hint: "All recorded income",
    },
    {
      title: "Total Expenses",
      icon: CreditCard,
      value: formatCurrency(expenses),
      hint: "All recorded spending",
    },
    {
      title: "Balance",
      icon: Landmark,
      value: formatCurrency(balance),
      hint: "Income minus expenses",
    },
    {
      title: "This Month's Spending",
      icon: CalendarClock,
      value: formatCurrency(monthSpending),
      hint: now.toLocaleString("en-IN", { month: "long", year: "numeric" }),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold sm:text-2xl">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
