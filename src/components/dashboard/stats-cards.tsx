"use client";

import { useMemo } from "react";
import { Wallet, CreditCard, Landmark } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiTab } from "@/components/ui/multi-tab";
import { useTransactions } from "@/lib/transactions";
import {
  formatCurrency,
  PERIOD_PRESETS,
  txnDateRange,
  txnInRange,
  type PeriodPreset,
} from "@/lib/utils";

export function StatsCards({
  preset,
  onPresetChange,
}: {
  preset: PeriodPreset;
  onPresetChange: (p: PeriodPreset) => void;
}) {
  const { transactions } = useTransactions();

  const range = useMemo(() => txnDateRange(preset), [preset]);

  const { income, expenses, balance } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const t of transactions) {
      if (t.deleted || !txnInRange(t.date, range.start, range.end)) continue;
      if (t.type === "income") income += t.amount;
      else expenses += t.amount;
    }
    return { income, expenses, balance: income - expenses };
  }, [transactions, range]);

  const periodLabel =
    PERIOD_PRESETS.find((p) => p.id === preset)?.label ?? preset;

  const cards = [
    {
      title: "Income",
      icon: Wallet,
      value: formatCurrency(income),
      hint: periodLabel,
      tone: "text-green-600",
    },
    {
      title: "Expense",
      icon: CreditCard,
      value: formatCurrency(expenses),
      hint: periodLabel,
      tone: "text-red-600",
    },
    {
      title: "Balance",
      icon: Landmark,
      value: formatCurrency(balance),
      hint: "Income minus expense",
      tone: balance >= 0 ? "text-green-600" : "text-red-600",
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
          <Card key={card.title}>
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
