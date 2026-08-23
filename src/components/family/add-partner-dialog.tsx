"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  X,
} from "lucide-react";

import { useProfile } from "@/lib/profile";
import {
  createFamilyInvite,
  rejectFamilyInvite,
  useFamily,
  useMyOutgoingInvites,
} from "@/lib/family";
import { mailtoLink, smsLink, whatsappLink } from "@/lib/messaging";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function AddPartnerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile } = useProfile();
  const { family } = useFamily();
  const { pending, awaitingApproval } = useMyOutgoingInvites();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const code = pending[0]?.id ?? "";
  const link = useMemo(() => {
    if (!code) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/family/join/${code}`;
  }, [code]);

  const inviterName = profile?.displayName || profile?.email || "A FinTrack user";
  const shareText = `${inviterName} invited you to share expenses as family on FinTrack Pro. Open this link and sign in with Google to accept: ${link}`;

  const generate = async () => {
    if (!profile) return;
    setCreating(true);
    try {
      await createFamilyInvite(profile, family?.id);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not create invite link" });
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ variant: "destructive", title: "Copy failed" });
    }
  };

  const cancelLink = async () => {
    try {
      await rejectFamilyInvite(code);
      toast({ title: "Invite link cancelled" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not cancel the link" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add partner</DialogTitle>
          <DialogDescription>
            Share one invite link with a family member. They sign in with Google
            and accept, then you approve them before any data is shared.
          </DialogDescription>
        </DialogHeader>

        {awaitingApproval.length > 0 ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium">
              {awaitingApproval[0].inviteeName} accepted your invite.
            </p>
            <p className="text-xs text-muted-foreground">
              Approve or reject them from the banner on your dashboard.
            </p>
          </div>
        ) : null}

        {!link ? (
          <Button onClick={generate} disabled={creating || !profile}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create invite link
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input readOnly value={link} className="text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={copy}
                aria-label="Copy invite link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="grid gap-2">
              <Button
                asChild
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <a
                  href={whatsappLink("", shareText)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-[#25D366]" />
                  Send on WhatsApp
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <a href={smsLink("", shareText)}>
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  Send by SMS
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <a
                  href={mailtoLink(
                    "",
                    "Join my FinTrack family",
                    shareText
                  )}
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  Send by email
                </a>
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full gap-2 text-muted-foreground"
              onClick={cancelLink}
            >
              <X className="h-4 w-4" />
              Cancel this link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
