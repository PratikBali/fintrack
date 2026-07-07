"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { softDeleteTransaction, useTransactions } from "@/lib/transactions";
import { useAuth } from "@/lib/auth";
import { getCategoryIcon } from "@/lib/data";
import { byNewestFirst, cn, formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/lib/types";
import { TransactionDialog } from "@/components/add-expense-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete";

function TxnRow({
  t,
  uid,
  history,
  onEdit,
}: {
  t: Transaction;
  uid?: string;
  history?: boolean;
  onEdit?: (t: Transaction) => void;
}) {
  const Icon = getCategoryIcon(t.category);
  const deleted = !!t.deleted;
  return (
    <div
      className={cn(
        "flex items-center",
        history && "opacity-70",
        deleted && "opacity-50"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-muted",
          history ? "h-7 w-7" : "h-9 w-9"
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground",
            history ? "h-3.5 w-3.5" : "h-4 w-4"
          )}
        />
      </div>
      <div className={cn("min-w-0", history ? "ml-3 space-y-0.5" : "ml-4 space-y-1")}>
        <p
          className={cn(
            "truncate font-medium leading-none",
            history ? "text-xs text-muted-foreground" : "text-sm",
            deleted && "line-through"
          )}
        >
          {t.item || t.vendor}
        </p>
        <p
          className={cn(
            "truncate text-muted-foreground",
            history ? "text-[11px]" : "text-sm"
          )}
        >
          {(t.item ? t.vendor : t.category) || t.category} ·{" "}
          {history && t.createdAt
            ? `${format(new Date(t.date), "dd MMM yyyy")}, ${format(
                new Date(t.createdAt),
                "h:mm a"
              )}`
            : format(new Date(t.date), "dd MMM yyyy")}
        </p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
        {deleted && (
          <Badge
            variant="secondary"
            className={cn("font-normal", history && "px-1.5 py-0 text-[10px]")}
          >
            deleted
          </Badge>
        )}
        <span
          className={cn(
            "font-medium",
            history && "text-xs",
            deleted || history
              ? "text-muted-foreground"
              : t.type === "income"
                ? "text-green-500"
                : "text-red-500"
          )}
        >
          {!deleted && (t.type === "income" ? "+" : "-")}
          {formatCurrency(t.amount)}
        </span>
        {!history && !deleted && uid && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Edit transaction"
              onClick={() => onEdit?.(t)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <ConfirmDeleteButton
              title="Delete this transaction?"
              description="It moves to Transaction History as a permanent, greyed-out record and stops counting toward your totals."
              onConfirm={() => softDeleteTransaction(uid, t.id)}
            />
          </>
        )}
      </div>
    </div>
  );
}

export function RecentTransactions() {
  const { transactions, loading } = useTransactions();
  const { user } = useAuth();
  const [editing, setEditing] = useState<Transaction | null>(null);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading transactions…</p>
    );
  }

  const active = transactions.filter((t) => !t.deleted);

  if (active.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No transactions yet. Add your first one to get started.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {active.slice(0, 5).map((t) => (
          <TxnRow
            key={t.id}
            t={t}
            uid={user?.uid}
            onEdit={setEditing}
          />
        ))}
      </div>
      <TransactionDialog
        transaction={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </>
  );
}

export function TransactionHistory() {
  const { transactions, loading } = useTransactions();
  const { user } = useAuth();
  const [editing, setEditing] = useState<Transaction | null>(null);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading history…</p>;
  }

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No transactions yet.</p>
    );
  }

  const ordered = [...transactions].sort(byNewestFirst);

  return (
    <>
      <div className="space-y-3">
        {ordered.map((t) => (
          <TxnRow
            key={t.id}
            t={t}
            uid={user?.uid}
            history={!!t.deleted}
            onEdit={t.deleted ? undefined : setEditing}
          />
        ))}
      </div>
      <TransactionDialog
        transaction={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </>
  );
}
