"use client";

import { scanReceipt } from "@/ai/flows/scan-receipt";
import { DEFAULT_CATEGORY, INCOME_CATEGORY } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { addTransaction, updateTransaction } from "@/lib/transactions";
import type { NewTransaction, Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Loader2,
  ScanLine,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { TxnPrefSelect, CategoryPrefSelect } from "@/components/txn-pref-fields";
import { Button } from "@/components/ui/button";
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
  receipt: z.any().optional(),
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

  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (open) {
      form.reset(transaction ? txnToForm(transaction) : emptyDefaults);
      setReceiptPreview(null);
      setDateOpen(false);
    }
  }, [open, transaction, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
        form.setValue("receipt", file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptPreview(null);
    form.setValue("receipt", null);
  };

  const handleScanReceipt = async () => {
    if (!receiptPreview) return;
    setIsScanning(true);
    try {
      const result = await scanReceipt({ photoDataUri: receiptPreview });
      form.setValue("amount", result.amount);
      form.setValue("vendor", result.vendor);
      form.setValue("date", new Date(result.date));
      toast({
        title: "Receipt Scanned",
        description: "Transaction details have been filled in.",
      });
    } catch (error) {
      console.error("Failed to scan receipt:", error);
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: "Could not extract details from the receipt.",
      });
    } finally {
      setIsScanning(false);
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
      setReceiptPreview(null);
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
                : "Enter details manually or scan a receipt."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              id="transaction-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-4 space-y-4"
            >
            <div className="grid md:grid-cols-2 gap-4">
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
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <CategoryPrefSelect
                        value={field.value}
                        onChange={field.onChange}
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
              <div className="space-y-2 flex flex-col">
                <FormLabel>Receipt</FormLabel>
                <div className="flex-grow aspect-square rounded-md border border-dashed flex items-center justify-center relative bg-muted/50">
                  {receiptPreview ? (
                    <>
                      <Image
                        src={receiptPreview}
                        alt="Receipt preview"
                        layout="fill"
                        objectFit="contain"
                        className="rounded-md"
                        data-ai-hint="receipt"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={handleRemoveReceipt}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <p>Upload a receipt</p>
                      <p className="text-xs">Optional</p>
                    </div>
                  )}
                </div>
                <FormField
                  control={form.control}
                  name="receipt"
                  render={() => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  onClick={handleScanReceipt}
                  disabled={!receiptPreview || isScanning}
                  className="w-full"
                >
                  {isScanning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="mr-2 h-4 w-4" />
                  )}
                  {isScanning ? "Scanning..." : "Scan with AI"}
                </Button>
              </div>
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
