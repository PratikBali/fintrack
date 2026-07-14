"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, PiggyBank, Plus, Pencil } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useTransactions } from "@/lib/transactions";
import { useTxnPrefs } from "@/lib/txn-prefs";
import { addBudget, deleteBudget, updateBudget, useBudgets } from "@/lib/budgets";
import { useRegisterQuickAdd } from "@/lib/quick-add";
import { getCategoryIcon, INCOME_CATEGORY } from "@/lib/data";
import { cn, formatCurrency, formatCurrencyShort } from "@/lib/utils";
import type { Budget } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteButton } from "@/components/confirm-delete";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function barColor(pct: number) {
  if (pct > 100) return "bg-red-500";
  if (pct >= 75) return "bg-amber-500";
  return "bg-green-500";
}

function BudgetDialog({
  uid,
  budget,
  selectableCategories,
  open,
  onOpenChange,
}: {
  uid: string;
  budget: Budget | null;
  selectableCategories: string[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = !!budget;

  useEffect(() => {
    if (open) {
      setCategory(budget?.category ?? "");
      setAmount(budget ? String(budget.amount) : "");
    }
  }, [open, budget]);

  const submit = async () => {
    const value = Number(amount);
    if (!category || !Number.isFinite(value) || value <= 0) {
      toast({ variant: "destructive", title: "Pick a category and amount" });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateBudget(uid, budget.id, { amount: value });
      } else {
        await addBudget(uid, { category, amount: value });
      }
      toast({
        title: isEdit ? "Budget updated" : "Budget added",
        description: `${category} · ${formatCurrency(value)}/mo`,
      });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not save budget" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit budget" : "New budget"}</DialogTitle>
          <DialogDescription>
            Set a monthly spending limit for a category.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category || undefined}
              onValueChange={setCategory}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {selectableCategories.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    All categories already have a budget.
                  </p>
                ) : (
                  selectableCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Monthly limit (₹)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 8000"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save" : "Add budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BudgetsView() {
  const { user } = useAuth();
  const { budgets, loading } = useBudgets();
  const { transactions } = useTransactions();
  const { prefs } = useTxnPrefs();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = now.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.deleted || t.type !== "expense") continue;
      if (!(t.date ?? "").startsWith(monthPrefix)) continue;
      const cat = t.category ?? "Other";
      map.set(cat, (map.get(cat) ?? 0) + t.amount);
    }
    return map;
  }, [transactions, monthPrefix]);

  const rows = useMemo(
    () =>
      budgets.map((b) => {
        const spent = spentByCategory.get(b.category) ?? 0;
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        return { budget: b, spent, pct, remaining: b.amount - spent };
      }),
    [budgets, spentByCategory]
  );

  const totals = useMemo(() => {
    const budgeted = budgets.reduce((s, b) => s + b.amount, 0);
    const spent = rows.reduce((s, r) => s + r.spent, 0);
    return { budgeted, spent, remaining: budgeted - spent };
  }, [budgets, rows]);

  const selectableCategories = useMemo(() => {
    const taken = new Set(budgets.map((b) => b.category));
    return (prefs.categories ?? [])
      .map((c) => c.name)
      .filter((name) => name !== INCOME_CATEGORY && !taken.has(name));
  }, [prefs.categories, budgets]);

  const openAdd = useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);
  const openEdit = (b: Budget) => {
    setEditing(b);
    setDialogOpen(true);
  };

  useRegisterQuickAdd("Add budget", openAdd);

  const overallPct = totals.budgeted > 0 ? (totals.spent / totals.budgeted) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Budgets</CardTitle>
            <Button size="sm" className="shrink-0" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" />
              Add budget
            </Button>
          </div>
          <CardDescription>
            Monthly spending limits · {monthLabel}
          </CardDescription>
        </CardHeader>
        {budgets.length > 0 && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
              <div className="min-w-0 rounded-lg border bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground">Budgeted</p>
                <p className="truncate text-sm font-bold tabular-nums sm:text-lg">
                  {formatCurrencyShort(totals.budgeted)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className="truncate text-sm font-bold tabular-nums text-red-600 sm:text-lg">
                  {formatCurrencyShort(totals.spent)}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border bg-muted/30 p-2.5">
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p
                  className={cn(
                    "truncate text-sm font-bold tabular-nums sm:text-lg",
                    totals.remaining >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatCurrencyShort(totals.remaining)}
                </p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", barColor(overallPct))}
                style={{ width: `${Math.min(overallPct, 100)}%` }}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PiggyBank className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No budgets yet. Add one to track your monthly spending.
            </p>
            <Button onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" />
              Add your first budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ budget, spent, pct, remaining }) => {
            const Icon = getCategoryIcon(budget.category);
            const over = remaining < 0;
            return (
              <Card key={budget.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{budget.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(spent)} of {formatCurrency(budget.amount)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold",
                        over ? "text-red-600" : "text-muted-foreground"
                      )}
                    >
                      {pct.toFixed(0)}%
                    </span>
                    <div className="flex shrink-0 items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        aria-label="Edit budget"
                        onClick={() => openEdit(budget)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {user?.uid && (
                        <ConfirmDeleteButton
                          title="Delete this budget?"
                          description="The spending limit is removed. Your transactions are not affected."
                          onConfirm={() => deleteBudget(user.uid, budget.id)}
                        />
                      )}
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", barColor(pct))}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs">
                    {over ? (
                      <span className="font-medium text-red-600">
                        Over by {formatCurrency(-remaining)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {formatCurrency(remaining)} left
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {user?.uid && (
        <BudgetDialog
          uid={user.uid}
          budget={editing}
          selectableCategories={selectableCategories}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}
