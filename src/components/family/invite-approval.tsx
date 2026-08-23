"use client";

import { useState } from "react";
import { Loader2, Mail, Phone, UserRound } from "lucide-react";

import { useProfile } from "@/lib/profile";
import {
  approveFamilyInvite,
  rejectFamilyInvite,
  useFamily,
  useMyOutgoingInvites,
} from "@/lib/family";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The owner's half of the handshake. The invite document itself is the
 * notification channel — there is no push or email infrastructure in the app.
 */
export function FamilyInviteApproval() {
  const { profile } = useProfile();
  const { family } = useFamily();
  const { awaitingApproval } = useMyOutgoingInvites();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const invite = awaitingApproval.find((i) => !dismissed.includes(i.id));
  if (!invite || !profile) return null;

  const approve = async () => {
    setBusy(true);
    try {
      await approveFamilyInvite(invite.id, profile, family?.id);
      toast({
        title: "Partner added",
        description: `${invite.inviteeName} is now part of your family.`,
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not approve this partner" });
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    try {
      await rejectFamilyInvite(invite.id);
      toast({
        title: "Partner not added",
        description: "Nothing was shared. Send a fresh invite any time.",
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not reject this partner" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) setDismissed((d) => [...d, invite.id]);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Family invitation accepted</DialogTitle>
          <DialogDescription>
            This person accepted your invite. Approve them to share family
            expense data, or reject to cancel it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{invite.inviteeName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 break-all">{invite.inviteeEmail}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{invite.inviteePhone || "Not shared"}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={reject} disabled={busy}>
            Reject
          </Button>
          <Button onClick={approve} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
