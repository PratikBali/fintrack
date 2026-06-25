"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/profile";
import { acceptInvite } from "@/lib/groups";

const PENDING_INVITE_KEY = "fintrack_pending_invite";

export default function JoinPage() {
  const params = useParams();
  const code = String(params?.code ?? "");
  const router = useRouter();
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const [status, setStatus] = useState("Joining group…");

  // Stash the code so it survives the login round-trip.
  useEffect(() => {
    if (!code) return;
    try {
      localStorage.setItem(PENDING_INVITE_KEY, code);
    } catch {
      /* ignore */
    }
  }, [code]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setStatus("Please sign in to join…");
      router.replace("/login");
      return;
    }
    if (!profile) return; // wait for profile mirror

    let done = false;
    acceptInvite(code, profile)
      .then(() => {
        if (done) return;
        try {
          localStorage.removeItem(PENDING_INVITE_KEY);
        } catch {
          /* ignore */
        }
        setStatus("Joined! Taking you in…");
      })
      .catch((e) => {
        console.error("join failed", e);
        setStatus("This invite is invalid or expired.");
      })
      .finally(() => {
        setTimeout(() => router.replace("/"), 900);
      });

    return () => {
      done = true;
    };
  }, [loading, user, profile, code, router]);

  return (
    <div className="flex min-h-screen items-center justify-center gap-2 bg-background text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      {status}
    </div>
  );
}
