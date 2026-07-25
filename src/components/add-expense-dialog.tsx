"use client";

import {
  CATEGORY_GROUPS,
  DEFAULT_CATEGORY,
  INCOME_CATEGORY,
  resolveCategoryGroup,
} from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { addTransaction, updateTransaction } from "@/lib/transactions";
import { useTxnPrefs } from "@/lib/txn-prefs";
import type {
  CategoryGroup,
  CategoryOption,
  NewTransaction,
  Transaction,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { TxnPrefSelect, CategoryPrefSelect } from "@/components/txn-pref-fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MultiTab } from "@/components/ui/multi-tab";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive."),
  vendor: z.string().min(1, "Vendor is required."),
  item: z.string().min(1, "Item is required."),
  date: z.date(),
  category: z.string().optional(),
  txnAppId: z.string().optional(),
  accountId: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const emptyDefaults: FormValues = {
  amount: 0,
  vendor: "",
  item: "",
  date: new Date(),
  category: DEFAULT_CATEGORY,
  txnAppId: "",
  accountId: "",
  notes: "",
};

function txnToForm(t: Transaction): FormValues {
  return {
    amount: t.amount,
    vendor: t.vendor,
    item: t.item,
    // Noon local avoids UTC off-by-one when editing yyyy-MM-dd dates.
    date: new Date(`${t.date}T12:00:00`),
    category: t.category ?? "",
    txnAppId: t.txnAppId ?? "",
    accountId: t.accountId ?? "",
    notes: t.notes ?? "",
  };
}

export function TransactionDialog({
  children,
  transaction,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  children?: React.ReactNode;
  transaction?: Transaction | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = !!transaction;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [dateOpen, setDateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryGroup, setCategoryGroup] =
    useState<CategoryGroup>("consumable");
  const { user } = useAuth();
  const { toast } = useToast();
  const { prefs } = useTxnPrefs();

  // Latest preferred defaults, read only when a new-txn form is opened so
  // changing the default mid-edit never wipes in-progress input.
  const newTxnDefaultsRef = useRef({
    txnAppId: "",
    accountId: "",
    category: DEFAULT_CATEGORY,
  });
  newTxnDefaultsRef.current = {
    txnAppId: prefs.defaultAppId || "",
    accountId: prefs.defaultAccountId || "",
    category: prefs.defaultCategory || DEFAULT_CATEGORY,
  };

  // Always-current category list for group lookups inside effects/handlers.
  const categoriesRef = useRef<CategoryOption[]>([]);
  categoriesRef.current = prefs.categories ?? [];

  const groupOfCategory = (name: string): CategoryGroup =>
    resolveCategoryGroup(
      categoriesRef.current.find((c) => c.name === name) ?? { name }
    );

  const firstCategoryOfGroup = (group: CategoryGroup): string => {
    const list = categoriesRef.current.filter(
      (c) => resolveCategoryGroup(c) === group
    );
    if (group === "consumable") {
      return (
        (list.find((c) => c.name === DEFAULT_CATEGORY) ?? list[0])?.name ?? ""
      );
    }
    return list[0]?.name ?? "";
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (open) {
      const values = transaction
        ? txnToForm(transaction)
        : { ...emptyDefaults, ...newTxnDefaultsRef.current };
      form.reset(values);
      setCategoryGroup(groupOfCategory(values.category || DEFAULT_CATEGORY));
      setDateOpen(false);
    }
    // groupOfCategory reads a ref, so it's intentionally excluded from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transaction, form]);

  const handleCategoryGroupChange = (next: string) => {
    const group = next as CategoryGroup;
    setCategoryGroup(group);
    const current = form.getValues("category") || "";
    if (!current || groupOfCategory(current) !== group) {
      form.setValue("category", firstCategoryOfGroup(group));
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not signed in",
        description: "Please sign in again to save transactions.",
      });
      return;
    }

    const payload: NewTransaction = {
      amount: data.amount,
      vendor: data.vendor,
      item: data.item.trim(),
      type: data.category === INCOME_CATEGORY ? "income" : "expense",
      date: format(data.date, "yyyy-MM-dd"),
      notes: data.notes?.trim() || "",
    };
    const category = data.category?.trim();
    const txnAppId = data.txnAppId?.trim();
    const accountId = data.accountId?.trim();
    if (category) payload.category = category;
    if (txnAppId) payload.txnAppId = txnAppId;
    if (accountId) payload.accountId = accountId;

    setIsSaving(true);
    try {
      if (isEdit && transaction) {
        await updateTransaction(user.uid, transaction.id, payload);
        toast({
          title: "Transaction Updated",
          description: `${formatCurrency(data.amount)} at ${data.vendor} saved.`,
        });
      } else {
        await addTransaction(user.uid, payload);
        toast({
          title: "Transaction Saved",
          description: `${formatCurrency(data.amount)} at ${data.vendor} added.`,
        });
      }
      setOpen(false);
      form.reset(emptyDefaults);
    } catch (error) {
      console.error("Failed to save transaction:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save the transaction. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[425px] md:max-w-[600px]">
        <div className="flex-1 overflow-y-auto px-6 pb-4 pt-6">
          <DialogHeader className="pr-8">
            <DialogTitle>
              {isEdit ? "Edit Transaction" : "Add Transaction"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update transaction details."
                : "Enter transaction details."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              id="transaction-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-4 space-y-4"
            >
            <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Amount <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="₹0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Vendor <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Starbucks" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="item"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Item <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Coffee" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
                        Date <span className="text-destructive">*</span>
                      </FormLabel>
                      {/* modal={true} required so calendar works inside Dialog (Safari/Firefox). */}
                      <Popover open={dateOpen} onOpenChange={setDateOpen} modal>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="z-[60] w-auto p-0"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              if (date) setDateOpen(false);
                            }}
                            disabled={(date) =>
                              date > new Date() ||
                              date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label>Category type</Label>
                  <MultiTab
                    variant="secondary"
                    items={CATEGORY_GROUPS}
                    value={categoryGroup}
                    onValueChange={handleCategoryGroupChange}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <CategoryPrefSelect
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        group={categoryGroup}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="txnAppId"
                  render={({ field }) => (
                    <FormItem>
                      <TxnPrefSelect
                        kind="app"
                        label="Txn app"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Select app"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <TxnPrefSelect
                        kind="account"
                        label="Bank / credit card"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Select account"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes about this transaction."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </form>
          </Form>
        </div>
        <div className="shrink-0 border-t bg-background px-4 py-3 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.12)]">
          <Button
            type="submit"
            form="transaction-form"
            disabled={isSaving}
            className="h-11 w-full bg-accent text-accent-foreground shadow-md hover:bg-accent/90"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Add Transaction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Add-only wrapper used by the quick-add button. */
export function AddExpenseDialog({ children }: { children: React.ReactNode }) {
  return <TransactionDialog>{children}</TransactionDialog>;
}
