"use client";

import { useMemo } from "react";
import { CreditCard, Landmark } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiTab } from "@/components/ui/multi-tab";
import { Elephant } from "@/lib/data";
import { useTransactions } from "@/lib/transactions";
import { useBudgets } from "@/lib/budgets";
import {
  cn,
  formatCurrency,
  PERIOD_PRESETS,
  txnDateRange,
  txnInRange,
  type PeriodPreset,
} from "@/lib/utils";

export function StatsCards({
  preset,
  onPresetChange,
  onNavigateToBudgets,
}: {
  preset: PeriodPreset;
  onPresetChange: (p: PeriodPreset) => void;
  onNavigateToBudgets?: () => void;
}) {
  const { transactions } = useTransactions();
  const { budgets } = useBudgets();

  const range = useMemo(() => txnDateRange(preset), [preset]);

  const expenses = useMemo(() => {
    let total = 0;
    for (const t of transactions) {
      if (t.deleted || t.type !== "expense") continue;
      if (!txnInRange(t.date, range.start, range.end)) continue;
      total += t.amount;
    }
    return total;
  }, [transactions, range]);

  // Budgets are monthly, so these two tiles ignore the period tabs and always
  // reflect the current month.
  const { budgeted, balance } = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    let spent = 0;
    for (const t of transactions) {
      if (t.deleted || t.type !== "expense") continue;
      if (!(t.date ?? "").startsWith(monthPrefix)) continue;
      spent += t.amount;
    }
    const budgeted = budgets.reduce((s, b) => s + b.amount, 0);
    return { budgeted, balance: budgeted - spent };
  }, [budgets, transactions]);

  const periodLabel =
    PERIOD_PRESETS.find((p) => p.id === preset)?.label ?? preset;
  const hasBudget = budgeted > 0;

  const cards = [
    {
      title: "Budget",
      icon: Elephant,
      value: formatCurrency(budgeted),
      hint: hasBudget ? "Monthly limit" : "Tap to set a budget",
      tone: hasBudget ? "" : "text-muted-foreground",
      onClick: onNavigateToBudgets,
    },
    {
      title: "Expense",
      icon: CreditCard,
      value: formatCurrency(expenses),
      hint: periodLabel,
      tone: "text-red-600",
      onClick: undefined,
    },
    {
      title: "Balance",
      icon: Landmark,
      value: hasBudget ? formatCurrency(balance) : "—",
      hint: hasBudget ? "Budget − expense · this month" : "Set a budget first",
      tone: !hasBudget
        ? "text-muted-foreground"
        : balance >= 0
          ? "text-green-600"
          : "text-red-600",
      onClick: undefined,
    },
  ];

  return (
    <div className="space-y-4">
      <MultiTab
        variant="secondary"
        items={PERIOD_PRESETS.map((p) => ({ id: p.id, label: p.label }))}
        value={preset}
        onValueChange={(v) => onPresetChange(v as PeriodPreset)}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {cards.map((card) => (
          <Card
            key={card.title}
            role={card.onClick ? "button" : undefined}
            tabIndex={card.onClick ? 0 : undefined}
            onClick={card.onClick}
            onKeyDown={
              card.onClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      card.onClick?.();
                    }
                  }
                : undefined
            }
            className={cn(
              card.onClick &&
                "cursor-pointer transition-colors hover:bg-muted/50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-4 pb-2">
              <CardTitle className="text-xs font-medium sm:text-sm">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className={`text-xl font-bold sm:text-2xl ${card.tone}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
