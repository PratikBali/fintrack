"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { updateMyPhone, useProfile } from "@/lib/profile";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);

  // The global auth guard only protects "/", so this route guards itself.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Seed the phone field once, then leave the user's edits alone.
  useEffect(() => {
    if (profile && !seeded) {
      setPhone(profile.phone ?? "");
      setSeeded(true);
    }
  }, [profile, seeded]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const name =
    user.displayName ||
    profile?.displayName ||
    user.email?.split("@")[0] ||
    "User";

  const unchanged = phone.trim() === (profile?.phone ?? "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({
        variant: "destructive",
        title: "Phone required",
        description: "Enter a mobile number so friends can find you.",
      });
      return;
    }
    setSaving(true);
    try {
      await updateMyPhone(user.uid, phone);
      toast({
        title: "Profile updated",
        description: "Your phone number was saved.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 sm:px-6">
        <Button variant="ghost" size="icon" asChild aria-label="Back to dashboard">
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-lg font-bold tracking-tight">Profile</h1>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 sm:px-6">
        <Card>
          <CardHeader className="items-center text-center">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.photoURL || "https://placehold.co/64x64"} alt={name} />
              <AvatarFallback className="text-lg">
                {name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="mt-2">{name}</CardTitle>
            <CardDescription>Manage your account details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email ?? ""} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used so friends can find and invite you.
                </p>
              </div>
              <Button type="submit" disabled={saving || unchanged}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
