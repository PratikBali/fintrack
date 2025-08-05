"use client";

import { scanReceipt } from "@/ai/flows/scan-receipt";
import { categories } from "@/lib/data";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Loader2,
  ScanLine,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive."),
  vendor: z.string().min(1, "Vendor is required."),
  date: z.date(),
  category: z.string().min(1, "Category is required."),
  notes: z.string().optional(),
  receipt: z.any().optional(),
});

type AddExpenseFormValues = z.infer<typeof formSchema>;

export function AddExpenseDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      vendor: "",
      date: new Date(),
      notes: "",
    },
  });

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
  }

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

  const onSubmit = (data: AddExpenseFormValues) => {
    console.log(data);
    toast({
      title: "Transaction Added",
      description: `Successfully added expense of $${data.amount} at ${data.vendor}.`,
    });
    setOpen(false);
    form.reset();
    setReceiptPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Enter transaction details manually or scan a receipt.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="$0.00" {...field} />
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
                      <FormLabel>Vendor</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Starbucks" {...field} />
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
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
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
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
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
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.name} value={cat.name}>
                              <div className="flex items-center gap-2">
                                <cat.icon className="h-4 w-4" />
                                {cat.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={handleRemoveReceipt}>
                          <Trash2 className="h-4 w-4"/>
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
                  render={({ field }) => (
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
            <DialogFooter>
              <Button type="submit" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                Add Transaction
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
