"use client";

import { useCallback, useState } from "react";
import { format } from "date-fns";
import {
  Loader2,
  MessageCircle,
  Plus,
  Send,
  UserPlus,
} from "lucide-react";

import {
  addContact,
  addLedgerEntry,
  softDeleteLedgerEntry,
  useLedger,
} from "@/lib/ledger";
import { reminderText, smsLink, whatsappLink } from "@/lib/messaging";
import { byNewestFirst, cn, formatCurrency } from "@/lib/utils";
import type { ContactType, LedgerDirection, LedgerEntry } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteButton } from "@/components/confirm-delete";
import { useRegisterQuickAdd } from "@/lib/quick-add";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
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

const CONTACT_TYPES: ContactType[] = ["vendor", "dealer", "friend", "other"];

function AddContactDialog({
  uid,
  open: openProp,
  onOpenChange,
}: {
  uid: string;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<ContactType>("vendor");
  const [phone, setPhone] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addContact(uid, { name: name.trim(), type, phone: phone.trim() });
      toast({ title: "Contact added", description: name.trim() });
      setName("");
      setPhone("");
      setType("vendor");
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not add contact" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>New Contact</DialogTitle>
          <DialogDescription>
            A vendor, dealer, or friend you exchange money with.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sharma Traders"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ContactType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Phone (for reminders)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              inputMode="tel"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddEntryDialog({
  uid,
  contacts,
  open: openProp,
  onOpenChange,
}: {
  uid: string;
  contacts: { id: string; name: string }[];
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [saving, setSaving] = useState(false);
  const [contactId, setContactId] = useState("");
  const [direction, setDirection] = useState<LedgerDirection>("get");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");

  const submit = async () => {
    const value = Number(amount);
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact || !value || value <= 0) return;
    setSaving(true);
    try {
      await addLedgerEntry(uid, {
        contactId: contact.id,
        contactName: contact.name,
        amount: value,
        direction,
        date,
        note: note.trim(),
      });
      toast({
        title: "Entry added",
        description: `${direction === "get" ? "You'll Get" : "You'll Give"} ${formatCurrency(value)}`,
      });
      setAmount("");
      setNote("");
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not add entry" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={contacts.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>New Ledger Entry</DialogTitle>
          <DialogDescription>Record money given or received.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Contact</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger>
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={direction === "get" ? "default" : "outline"}
              className={cn(direction === "get" && "bg-green-600 hover:bg-green-600/90")}
              onClick={() => setDirection("get")}
            >
              You&apos;ll Get
            </Button>
            <Button
              type="button"
              variant={direction === "give" ? "default" : "outline"}
              className={cn(direction === "give" && "bg-red-600 hover:bg-red-600/90")}
              onClick={() => setDirection("give")}
            >
              You&apos;ll Give
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. cement supply"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving || !contactId || !amount}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EntryRow({
  e,
  uid,
  history,
}: {
  e: LedgerEntry;
  uid?: string;
  history?: boolean;
}) {
  const deleted = !!e.deleted;
  const get = e.direction === "get";
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-2",
        history ? "text-xs" : "text-sm",
        history && "opacity-70",
        deleted && "opacity-50"
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-medium",
            history && "text-muted-foreground",
            deleted && "line-through"
          )}
        >
          {e.contactName}
          {e.note ? (
            <span className="font-normal text-muted-foreground"> · {e.note}</span>
          ) : null}
        </p>
        <p
          className={cn(
            "text-muted-foreground",
            history ? "text-[11px]" : "text-xs"
          )}
        >
          {history && e.createdAt
            ? `${format(new Date(e.date), "dd MMM yyyy")}, ${format(
                new Date(e.createdAt),
                "h:mm a"
              )}`
            : format(new Date(e.date), "dd MMM yyyy")}{" "}
          · {get ? "You'll Get" : "You'll Give"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
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
            deleted || history
              ? "text-muted-foreground"
              : get
                ? "text-green-600"
                : "text-red-600"
          )}
        >
          {formatCurrency(e.amount)}
        </span>
        {!history && !deleted && uid && (
          <ConfirmDeleteButton
            title="Delete this entry?"
            description="It moves to Entry History as a permanent, greyed-out record and stops counting toward balances."
            onConfirm={() => softDeleteLedgerEntry(uid, e.id)}
          />
        )}
      </div>
    </div>
  );
}

export function LedgerView() {
  const { contacts, entries, balances, totals, loading, uid } = useLedger();
  const activeEntries = entries.filter((e) => !e.deleted);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const hasContacts = contacts.length > 0;
  const openQuickAdd = useCallback(() => {
    if (hasContacts) setAddEntryOpen(true);
    else setAddContactOpen(true);
  }, [hasContacts]);
  useRegisterQuickAdd(hasContacts ? "Add Entry" : "Add Contact", openQuickAdd);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>You&apos;ll Get</CardDescription>
            <CardTitle className="text-xl text-green-600 sm:text-2xl">
              {formatCurrency(totals.willGet)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription>You&apos;ll Give</CardDescription>
            <CardTitle className="text-xl text-red-600 sm:text-2xl">
              {formatCurrency(totals.willGive)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Ledger</CardTitle>
            <CardDescription>Who owes you, and whom you owe.</CardDescription>
          </div>
          {uid && (
            <div className="flex flex-wrap gap-2">
              <AddContactDialog
                uid={uid}
                open={addContactOpen}
                onOpenChange={setAddContactOpen}
              />
              <AddEntryDialog
                uid={uid}
                contacts={contacts}
                open={addEntryOpen}
                onOpenChange={setAddEntryOpen}
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading ledger…</p>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No contacts yet. Add a vendor, dealer, or friend to start tracking.
            </p>
          ) : (
            <div className="divide-y">
              {balances.map(({ contact, balance }) => {
                const positive = balance > 0;
                const settled = Math.abs(balance) < 0.01;
                const reminder = reminderText(contact.name, balance);
                return (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{contact.name}</span>
                        <Badge variant="secondary" className="capitalize">
                          {contact.type}
                        </Badge>
                      </div>
                      {contact.phone ? (
                        <p className="text-xs text-muted-foreground">{contact.phone}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p
                          className={cn(
                            "font-semibold",
                            settled
                              ? "text-muted-foreground"
                              : positive
                                ? "text-green-600"
                                : "text-red-600"
                          )}
                        >
                          {formatCurrency(Math.abs(balance))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {settled
                            ? "Settled"
                            : positive
                              ? "You'll Get"
                              : "You'll Give"}
                        </p>
                      </div>
                      {positive && contact.phone ? (
                        <div className="flex gap-1">
                          <Button
                            asChild
                            size="icon"
                            variant="outline"
                            title="Remind on WhatsApp"
                          >
                            <a
                              href={whatsappLink(contact.phone, reminder)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            </a>
                          </Button>
                          <Button
                            asChild
                            size="icon"
                            variant="outline"
                            title="Remind by SMS"
                          >
                            <a href={smsLink(contact.phone, reminder)}>
                              <Send className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {activeEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Entries</CardTitle>
            <CardDescription>
              Individual money in/out. Deleting moves them to history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {activeEntries.map((e) => (
                <EntryRow key={e.id} e={e} uid={uid} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Entry History</CardTitle>
            <CardDescription>
              Read-only log of every entry. Deleted ones are struck through.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {[...entries].sort(byNewestFirst).map((e) => (
                <EntryRow key={e.id} e={e} history />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
