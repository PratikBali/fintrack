"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/profile";
import {
  acceptFamilyInvite,
  clearPendingFamilyInvite,
  declineFamilyInvite,
  getFamilyInvite,
  stashPendingFamilyInvite,
  useFamily,
} from "@/lib/family";
import { useToast } from "@/hooks/use-toast";
import type { FamilyInvite } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Phase = "loading" | "needsGoogle" | "blocked" | "decide" | "done";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">{children}</Card>
    </div>
  );
}

export default function FamilyJoinPage() {
  const params = useParams();
  const code = String(params?.code ?? "");
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();
  const { profile } = useProfile();
  const { family } = useFamily();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("");
  const [invite, setInvite] = useState<FamilyInvite | null>(null);
  const [busy, setBusy] = useState(false);

  // Survive the login round-trip; the home page bounces back here.
  useEffect(() => {
    if (code) stashPendingFamilyInvite(code);
  }, [code]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // The invite must be claimed by a Google identity so the owner sees a real
    // name and email when approving.
    const viaGoogle = (user.providerData ?? []).some(
      (p) => p?.providerId === "google.com"
    );
    if (!viaGoogle) {
      setPhase("needsGoogle");
      return;
    }

    // Wait for the profile mirror; it proves they are a FinTrack member.
    if (!profile) return;

    let cancelled = false;
    getFamilyInvite(code)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setMessage("This invite link is not valid.");
          setPhase("blocked");
          return;
        }
        if (found.status !== "pending") {
          setMessage("This invite link is no longer active.");
          setPhase("blocked");
          return;
        }
        if (found.ownerUid === user.uid) {
          setMessage("This is your own invite link.");
          setPhase("blocked");
          return;
        }
        if (family) {
          setMessage("You are already part of a family.");
          setPhase("blocked");
          return;
        }
        setInvite(found);
        setPhase("decide");
        // Decision UI is up, so the stash has done its job.
        clearPendingFamilyInvite();
      })
      .catch((e) => {
        console.error("family invite load", e);
        if (cancelled) return;
        setMessage("Could not load this invite.");
        setPhase("blocked");
      });

    return () => {
      cancelled = true;
    };
  }, [loading, user, profile, family, code, router]);

  const finish = (text: string) => {
    clearPendingFamilyInvite();
    setMessage(text);
    setPhase("done");
    setTimeout(() => router.replace("/"), 1600);
  };

  const accept = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      await acceptFamilyInvite(code, profile);
      finish(
        `Sent to ${invite?.ownerName ?? "the owner"} for approval. You will join once they approve.`
      );
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not accept the invite" });
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      await declineFamilyInvite(code, profile);
      finish("Invite declined. The link is now closed.");
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not decline the invite" });
      setBusy(false);
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-background text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Checking your invite…
      </div>
    );
  }

  if (phase === "needsGoogle") {
    return (
      <Shell>
        <CardHeader>
          <CardTitle>Sign in with Google</CardTitle>
          <CardDescription>
            Family invites must be accepted with a Google account so the owner
            can confirm who is joining.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() => signInWithGoogle().catch(console.error)}
          >
            Continue with Google
          </Button>
        </CardContent>
      </Shell>
    );
  }

  if (phase === "blocked" || phase === "done") {
    return (
      <Shell>
        <CardHeader>
          <CardTitle>
            {phase === "done" ? "All done" : "Invite unavailable"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.replace("/")}
          >
            Go to FinTrack
          </Button>
        </CardContent>
      </Shell>
    );
  }

  return (
    <Shell>
      <CardHeader className="items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="mt-2">Family invitation</CardTitle>
        <CardDescription>
          <span className="font-medium text-foreground">
            {invite?.ownerName}
          </span>{" "}
          wants to share expense data with you as family. Accepting sends your
          name, email and phone to them for approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button onClick={accept} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Accept invitation
        </Button>
        <Button variant="outline" onClick={decline} disabled={busy}>
          Decline
        </Button>
      </CardContent>
    </Shell>
  );
}
