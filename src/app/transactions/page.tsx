"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useTransactions } from "@/lib/transactions";
import {
  byNewestFirst,
  formatCurrency,
  txnDateRange,
  txnInRange,
  type TxnDatePreset,
} from "@/lib/utils";
import { TxnRow } from "@/components/dashboard/recent-transactions";
import { TransactionDialog } from "@/components/add-expense-dialog";
import type { Transaction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESETS: { id: TxnDatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom" },
];

export default function TransactionsPage() {
  const { user, loading } = useAuth();
  const { transactions, loading: txLoading } = useTransactions();
  const router = useRouter();

  const [preset, setPreset] = useState<TxnDatePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const range = useMemo(
    () =>
      txnDateRange(preset, {
        from: customFrom,
        to: customTo,
      }),
    [preset, customFrom, customTo]
  );

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => !t.deleted && txnInRange(t.date, range.start, range.end))
      .sort(byNewestFirst);
  }, [transactions, range]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 sm:px-6">
        <Button variant="ghost" size="icon" asChild aria-label="Back to dashboard">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-bold tracking-tight">All Transactions</h1>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={preset === p.id ? "default" : "outline"}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="font-semibold text-green-600">
                {formatCurrency(totals.income)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="font-semibold text-red-600">
                {formatCurrency(totals.expense)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Net</p>
              <p className="font-semibold">{formatCurrency(totals.net)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {filtered.length} in range · {range.start} to {range.end}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transactions in this period.
              </p>
            ) : (
              <div className="space-y-6">
                {filtered.map((t) => (
                  <TxnRow
                    key={t.id}
                    t={t}
                    uid={user.uid}
                    onEdit={setEditing}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <TransactionDialog
        transaction={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </div>
  );
}
