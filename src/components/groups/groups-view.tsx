"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Link2,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import {
  addGroupExpense,
  addMemberToGroup,
  computeGroupBalances,
  createGroup,
  createInvite,
  deleteGroup,
  pairwiseNet,
  recordSettlement,
  softDeleteGroupExpense,
  useGroupExpenses,
  useGroups,
} from "@/lib/groups";
import { useRegisterQuickAdd } from "@/lib/quick-add";
import type { GroupExpense } from "@/lib/types";
import { searchProfiles, updateMyPhone, useProfile } from "@/lib/profile";
import { smsLink, whatsappLink } from "@/lib/messaging";
import { byNewestFirst, cn, formatCurrency } from "@/lib/utils";
import type { Group, GroupMember, UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDeleteButton } from "@/components/confirm-delete";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

function PhoneBanner({ uid }: { uid: string }) {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!phone.trim()) return;
    setSaving(true);
    try {
      await updateMyPhone(uid, phone);
      toast({ title: "Phone saved", description: "Friends can now find you." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not save phone" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-accent">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="text-sm font-medium">Add your phone number</p>
          <p className="text-xs text-muted-foreground">
            So friends can find and add you to groups by number.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile"
            inputMode="tel"
            className="sm:w-40"
          />
          <Button onClick={save} disabled={saving || !phone.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateGroupDialog({
  me,
  open: openProp,
  onOpenChange,
}: {
  me: UserProfile;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createGroup(me, name.trim());
      toast({ title: "Group created", description: name.trim() });
      setName("");
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not create group" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>
            You&apos;re added automatically. Invite members next.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Group name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Goa Trip"
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({ group, me }: { group: Group; me: UserProfile }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  // Search-by-phone/email
  const [term, setTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searched, setSearched] = useState(false);

  // Invite link
  const [link, setLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");

  const runSearch = async () => {
    if (!term.trim()) return;
    setSearching(true);
    setSearched(false);
    try {
      setResults(await searchProfiles(term));
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Search failed" });
    } finally {
      setSearching(false);
      setSearched(true);
    }
  };

  const add = async (profile: UserProfile) => {
    try {
      await addMemberToGroup(group.id, profile);
      toast({ title: "Member added", description: profile.displayName });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not add member" });
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const code = await createInvite(group.id, group.name, me.displayName);
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      setLink(`${origin}/join/${code}`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not create link" });
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const inviteMsg = `Join my FinTrack group "${group.name}": ${link}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add Member — {group.name}</DialogTitle>
          <DialogDescription>
            Find an existing FinTrack user, or invite by link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Find by phone or email</Label>
            <div className="flex gap-2">
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Phone or email"
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
              <Button onClick={runSearch} disabled={searching || !term.trim()}>
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {results.map((r) => {
              const already = group.memberUids.includes(r.uid);
              return (
                <div
                  key={r.uid}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.email}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={already ? "ghost" : "default"}
                    disabled={already}
                    onClick={() => add(r)}
                  >
                    {already ? "Added" : "Add"}
                  </Button>
                </div>
              );
            })}
            {searched && results.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No FinTrack user found. Invite them by link below.
              </p>
            )}
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label>Invite by link (WhatsApp / SMS)</Label>
            {!link ? (
              <Button
                variant="outline"
                onClick={generate}
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                Generate invite link
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={link} readOnly className="text-xs" />
                  <Button size="icon" variant="outline" onClick={copy}>
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="Friend's number"
                    inputMode="tel"
                  />
                  <Button asChild size="icon" variant="outline" disabled={!invitePhone}>
                    <a
                      href={whatsappLink(invitePhone, inviteMsg)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4 text-green-600" />
                    </a>
                  </Button>
                  <Button asChild size="icon" variant="outline" disabled={!invitePhone}>
                    <a href={smsLink(invitePhone, inviteMsg)}>
                      <Send className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddGroupExpenseDialog({
  group,
  me,
  members,
  open: openProp,
  onOpenChange,
}: {
  group: Group;
  me: UserProfile;
  members: GroupMember[];
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidByUid, setPaidByUid] = useState(me.uid);
  const [splitAmongUids, setSplitAmongUids] = useState<string[]>(
    members.map((m) => m.uid)
  );
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    if (open) setSplitAmongUids(members.map((m) => m.uid));
  }, [open, members]);

  const toggle = (uid: string) =>
    setSplitAmongUids((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
    );

  const submit = async () => {
    const value = Number(amount);
    if (!description.trim() || !value || value <= 0 || splitAmongUids.length === 0)
      return;
    setSaving(true);
    try {
      await addGroupExpense(group.id, {
        description: description.trim(),
        amount: value,
        paidByUid,
        splitAmongUids,
        date,
        createdByUid: me.uid,
      });
      toast({ title: "Expense added", description: description.trim() });
      setDescription("");
      setAmount("");
      setSplitAmongUids(members.map((m) => m.uid));
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not add expense" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="flex-1 sm:flex-none">
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add Expense — {group.name}</DialogTitle>
          <DialogDescription>Split equally among selected members.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dinner"
            />
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
            <Label>Paid by</Label>
            <Select value={paidByUid} onValueChange={setPaidByUid}>
              <SelectTrigger>
                <SelectValue placeholder="Who paid?" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.uid} value={m.uid}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Split among</Label>
            <div className="grid grid-cols-2 gap-2">
              {members.map((m) => (
                <label
                  key={m.uid}
                  className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={splitAmongUids.includes(m.uid)}
                    onCheckedChange={() => toggle(m.uid)}
                  />
                  <span className="truncate">{m.name}</span>
                </label>
              ))}
            </div>
            {amount && splitAmongUids.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(Number(amount) / splitAmongUids.length)} each
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={
              saving || !description.trim() || !amount || splitAmongUids.length === 0
            }
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettleUpDialog({
  group,
  me,
  target,
  members,
  expenses,
  onClose,
}: {
  group: Group;
  me: UserProfile;
  target: GroupMember;
  members: GroupMember[];
  expenses: GroupExpense[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const pw = useMemo(
    () => pairwiseNet(me.uid, target.uid, members, expenses),
    [me.uid, target.uid, members, expenses]
  );
  const iPay = pw < 0; // negative => I owe them
  const owed = Math.abs(pw);
  const settled = owed < 0.01;
  const [amount, setAmount] = useState(settled ? "" : owed.toFixed(2));
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const val = Number(amount);
    if (!val || val <= 0) return;
    setSaving(true);
    try {
      await recordSettlement(group.id, {
        fromUid: iPay ? me.uid : target.uid,
        toUid: iPay ? target.uid : me.uid,
        amount: val,
        createdByUid: me.uid,
      });
      toast({
        title: "Settled up",
        description: iPay
          ? `You paid ${target.name} ${formatCurrency(val)}`
          : `${target.name} paid you ${formatCurrency(val)}`,
      });
      onClose();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not settle up" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Settle up with {target.name}</DialogTitle>
          <DialogDescription>
            {settled
              ? "You're already settled up."
              : iPay
                ? `You will pay ${target.name}.`
                : `${target.name} will pay you.`}
          </DialogDescription>
        </DialogHeader>
        {!settled && (
          <div className="space-y-3">
            <div
              className={cn(
                "rounded-md border p-3 text-center text-sm",
                iPay ? "text-red-600" : "text-green-600"
              )}
            >
              {iPay ? "You pay" : "You receive"}{" "}
              <span className="font-semibold">{formatCurrency(owed)}</span>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={submit} disabled={saving || settled || !amount}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseRow({
  e,
  groupId,
  nameOf,
  history,
}: {
  e: GroupExpense;
  groupId: string;
  nameOf: (uid: string) => string;
  history?: boolean;
}) {
  const isSettlement = e.type === "settlement";
  const deleted = !!e.deleted;
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2",
        history ? "text-xs" : "text-sm",
        history && "opacity-70",
        deleted && "opacity-50"
      )}
    >
      <div className="min-w-0">
        <p
          className={cn(
            "flex items-center gap-2 truncate font-medium",
            history && "text-muted-foreground",
            deleted && "line-through"
          )}
        >
          {isSettlement ? "Settle up" : e.description}
          {isSettlement && (
            <Badge
              variant="secondary"
              className={cn("font-normal", history && "px-1.5 py-0 text-[10px]")}
            >
              payment
            </Badge>
          )}
          {deleted && (
            <Badge
              variant="secondary"
              className={cn("font-normal", history && "px-1.5 py-0 text-[10px]")}
            >
              deleted
            </Badge>
          )}
        </p>
        <p
          className={cn(
            "text-muted-foreground",
            history ? "text-[11px]" : "text-xs"
          )}
        >
          {isSettlement
            ? `${nameOf(e.paidByUid)} paid ${nameOf(e.splitAmongUids[0])}`
            : `${nameOf(e.paidByUid)} paid · ${e.splitAmongUids.length} way`}{" "}
          ·{" "}
          {history
            ? e.createdAt
              ? `${format(new Date(e.date), "dd MMM yyyy")}, ${format(
                  new Date(e.createdAt),
                  "h:mm a"
                )}`
              : format(new Date(e.date), "dd MMM yyyy")
            : format(new Date(e.date), "dd MMM")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "font-medium",
            (isSettlement || deleted || history) && "text-muted-foreground"
          )}
        >
          {formatCurrency(e.amount)}
        </span>
        {!history && !deleted && (
          <ConfirmDeleteButton
            title="Delete this expense?"
            description="It moves to History as a permanent, greyed-out record and stops counting toward balances."
            onConfirm={() => softDeleteGroupExpense(groupId, e.id)}
          />
        )}
      </div>
    </div>
  );
}

function GroupPanel({
  group,
  me,
  addExpenseOpen,
  setAddExpenseOpen,
}: {
  group: Group;
  me: UserProfile;
  addExpenseOpen: boolean;
  setAddExpenseOpen: (o: boolean) => void;
}) {
  const expenses = useGroupExpenses(group.id);
  const [settleTarget, setSettleTarget] = useState<GroupMember | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const members = useMemo(
    () => Array.from(new Map(group.members.map((m) => [m.uid, m])).values()),
    [group.members]
  );
  const { net, settlements, nameOf } = useMemo(
    () => computeGroupBalances(members, expenses),
    [members, expenses]
  );
  const activeExpenses = useMemo(
    () => expenses.filter((e) => !e.deleted),
    [expenses]
  );
  const totalSpent = useMemo(
    () =>
      activeExpenses.reduce(
        (sum, e) => (e.type === "settlement" ? sum : sum + e.amount),
        0
      ),
    [activeExpenses]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {members.length} members · {formatCurrency(totalSpent)} total
        </p>
        <div className="flex gap-2">
          <AddMemberDialog group={group} me={me} />
          <AddGroupExpenseDialog
            group={group}
            me={me}
            members={members}
            open={addExpenseOpen}
            onOpenChange={setAddExpenseOpen}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <Badge key={m.uid} variant="secondary">
            {m.name}
            {m.uid === group.ownerUid ? " (owner)" : ""}
          </Badge>
        ))}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-medium">Balances</h4>
        <div className="space-y-1">
          {members.map((m) => {
            const v = net[m.uid] ?? 0;
            const settled = Math.abs(v) < 0.01;
            const canSettle =
              m.uid !== me.uid &&
              Math.abs(pairwiseNet(me.uid, m.uid, members, expenses)) >= 0.01;
            return (
              <div
                key={m.uid}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="truncate">{m.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      settled
                        ? "text-muted-foreground"
                        : v > 0
                          ? "text-green-600"
                          : "text-red-600"
                    )}
                  >
                    {settled
                      ? "settled"
                      : v > 0
                        ? `gets ${formatCurrency(v)}`
                        : `owes ${formatCurrency(-v)}`}
                  </span>
                  {canSettle && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2"
                      onClick={() => setSettleTarget(m)}
                    >
                      Settle
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {settleTarget && (
        <SettleUpDialog
          key={settleTarget.uid}
          group={group}
          me={me}
          target={settleTarget}
          members={members}
          expenses={expenses}
          onClose={() => setSettleTarget(null)}
        />
      )}

      {settlements.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">Who pays whom</h4>
          <div className="space-y-1">
            {settlements.map((s, i) => (
              <div key={i} className="text-sm">
                <span className="text-red-600">{s.from}</span>
                {" → "}
                <span className="text-green-600">{s.to}</span>
                {": "}
                <span className="font-medium">{formatCurrency(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-sm font-medium">Expenses</h4>
        {activeExpenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses yet.</p>
        ) : (
          <div className="divide-y">
            {activeExpenses.map((e) => (
              <ExpenseRow
                key={e.id}
                e={e}
                groupId={group.id}
                nameOf={nameOf}
              />
            ))}
          </div>
        )}

        {expenses.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 px-2 text-muted-foreground"
              onClick={() => setShowHistory((v) => !v)}
            >
              {showHistory ? (
                <ChevronUp className="mr-1 h-4 w-4" />
              ) : (
                <ChevronDown className="mr-1 h-4 w-4" />
              )}
              {showHistory ? "Hide" : "Show"} history ({expenses.length})
            </Button>
            {showHistory && (
              <div className="mt-1 divide-y rounded-md border px-3">
                {[...expenses].sort(byNewestFirst).map((e) => (
                  <ExpenseRow
                    key={`h-${e.id}`}
                    e={e}
                    groupId={group.id}
                    nameOf={nameOf}
                    history
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DeleteGroupButton({ group }: { group: Group }) {
  const { toast } = useToast();

  const remove = async () => {
    try {
      await deleteGroup(group.id);
      toast({ title: "Group deleted", description: group.name });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Could not delete",
        description: "Only the group owner can delete it.",
      });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-red-600"
          aria-label="Delete group"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{group.name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the group and all its expenses for everyone.
            This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-600/90"
            onClick={() => {
              void remove();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function GroupsView() {
  const { profile, loading: profileLoading } = useProfile();
  const { groups, loading } = useGroups();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId
    ? groups.find((g) => g.id === selectedId) ?? null
    : null;
  const [createOpen, setCreateOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const hasSelection = !!selected;
  const openQuickAdd = useCallback(() => {
    if (hasSelection) setAddExpenseOpen(true);
    else setCreateOpen(true);
  }, [hasSelection]);
  useRegisterQuickAdd(hasSelection ? "Add Expense" : "New Group", openQuickAdd);

  return (
    <div className="space-y-4">
      {profile && !profile.phone && <PhoneBanner uid={profile.uid} />}

      <Card>
        {selected && profile ? (
          <>
            <CardHeader className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 w-fit text-muted-foreground"
                onClick={() => setSelectedId(null)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                All groups
              </Button>
              <CardTitle>{selected.name}</CardTitle>
              <CardDescription>
                {selected.memberUids.length} member
                {selected.memberUids.length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GroupPanel
                group={selected}
                me={profile}
                addExpenseOpen={addExpenseOpen}
                setAddExpenseOpen={setAddExpenseOpen}
              />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Group Expenses</CardTitle>
                <CardDescription>
                  Split bills with friends — everyone&apos;s a FinTrack member.
                </CardDescription>
              </div>
              {profile && (
                <CreateGroupDialog
                  me={profile}
                  open={createOpen}
                  onOpenChange={setCreateOpen}
                />
              )}
            </CardHeader>
            <CardContent>
              {loading || profileLoading ? (
                <p className="text-sm text-muted-foreground">Loading groups…</p>
              ) : groups.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No groups yet. Create one and invite friends.
                  </p>
                </div>
              ) : (
                <div className="divide-y rounded-md border">
                  {groups.map((g) => (
                    <div
                      key={g.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(g.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(g.id);
                        }
                      }}
                      className="flex cursor-pointer items-center justify-between gap-2 p-3 hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{g.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.memberUids.length} member
                          {g.memberUids.length === 1 ? "" : "s"}
                          {g.ownerUid === profile?.uid ? " · you own this" : ""}
                        </p>
                      </div>
                      <div
                        className="flex shrink-0 items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {profile && g.ownerUid === profile.uid && (
                          <DeleteGroupButton group={g} />
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
