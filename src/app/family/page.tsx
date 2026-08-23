"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, UserPlus, Users } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useTxnPrefs } from "@/lib/txn-prefs";
import { INCOME_CATEGORY } from "@/lib/data";
import {
  FAMILY_TIME_PRESETS,
  removeFamilyMember,
  resolveSharedFrom,
  saveFamilyShare,
  useFamily,
} from "@/lib/family";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { FamilyShare, FamilyTimePreset } from "@/lib/types";
import { AddPartnerDialog } from "@/components/family/add-partner-dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete";
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
import { MultiTab } from "@/components/ui/multi-tab";

const SETTING_TABS = [
  { id: "time", label: "Time" },
  { id: "category", label: "Category" },
] as const;

export default function FamilyPage() {
  const { user, loading } = useAuth();
  const { family, isOwner, loading: familyLoading } = useFamily();
  const { prefs } = useTxnPrefs();
  const { toast } = useToast();
  const router = useRouter();

  const [tab, setTab] = useState<string>("time");
  const [draft, setDraft] = useState<FamilyShare | null>(null);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // This route guards itself; the global guard only covers "/". Family
  // management is owner-only, so members get sent back even by direct URL.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    else if (!familyLoading && family && !isOwner) router.replace("/");
  }, [loading, user, familyLoading, family, isOwner, router]);

  // Seed the draft once the family lands, and re-seed after a remote change.
  useEffect(() => {
    if (family?.share) setDraft(family.share);
  }, [family?.share]);

  const categoryNames = useMemo(
    () =>
      (prefs.categories ?? [])
        .map((c) => c.name)
        .filter((name) => name !== INCOME_CATEGORY),
    [prefs.categories]
  );

  const dirty = useMemo(() => {
    if (!family?.share || !draft) return false;
    const a = family.share;
    return (
      a.timePreset !== draft.timePreset ||
      (a.customStart ?? "") !== (draft.customStart ?? "") ||
      a.allCategories !== draft.allCategories ||
      JSON.stringify(a.categories ?? []) !==
        JSON.stringify(draft.categories ?? [])
    );
  }, [family?.share, draft]);

  if (loading || familyLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const setTimePreset = (preset: FamilyTimePreset) =>
    setDraft((d) => (d ? { ...d, timePreset: preset } : d));

  const toggleCategory = (name: string) =>
    setDraft((d) => {
      if (!d) return d;
      const current = d.categories ?? [];
      return {
        ...d,
        categories: current.includes(name)
          ? current.filter((c) => c !== name)
          : [...current, name],
      };
    });

  const save = async () => {
    if (!family || !draft) return;
    setSaving(true);
    try {
      await saveFamilyShare(family.id, {
        ...draft,
        sharedFrom: resolveSharedFrom(draft.timePreset, draft.customStart),
      });
      toast({
        title: "Sharing updated",
        description: "Family members can now see the records you allowed.",
      });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Could not save sharing settings" });
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
        <h1 className="text-lg font-bold tracking-tight">Family</h1>
      </header>

      <main
        className={cn(
          "mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6",
          dirty && isOwner && "pb-24"
        )}
      >
        {!family ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                You have no family yet. Invite a partner to share expenses.
              </p>
              <Button onClick={() => setAddOpen(true)}>
                <UserPlus className="mr-1 h-4 w-4" />
                Add partner
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-row items-center justify-between gap-3">
                  <CardTitle>Members</CardTitle>
                  {isOwner && (
                    <Button
                      size="sm"
                      className="shrink-0"
                      onClick={() => setAddOpen(true)}
                    >
                      <UserPlus className="mr-1 h-4 w-4" />
                      Add
                    </Button>
                  )}
                </div>
                <CardDescription>
                  {family.members.length} member
                  {family.members.length === 1 ? "" : "s"} sharing expense data.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {family.members.map((m) => (
                  <div key={m.uid} className="flex items-center gap-3 py-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={m.photoURL || undefined} alt={m.name} />
                      <AvatarFallback>
                        {m.name[0]?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {m.name}
                        {m.uid === user?.uid ? " (you)" : ""}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.email}
                        {m.phone ? ` · ${m.phone}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                      {m.role}
                    </span>
                    {isOwner && m.role !== "owner" ? (
                      <ConfirmDeleteButton
                        title={`Remove ${m.name}?`}
                        description="They keep their own records but lose access to family data."
                        onConfirm={() => removeFamilyMember(family, m.uid)}
                      />
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>

            {isOwner && draft ? (
              <Card>
                <CardHeader>
                  <CardTitle>Shared data</CardTitle>
                  <CardDescription>
                    Choose how far back and which categories members can see.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MultiTab
                    variant="secondary"
                    items={SETTING_TABS}
                    value={tab}
                    onValueChange={setTab}
                  />

                  {tab === "time" ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {FAMILY_TIME_PRESETS.map((p) => (
                          <Button
                            key={p.id}
                            variant={
                              draft.timePreset === p.id ? "default" : "outline"
                            }
                            className="h-auto min-h-[2.75rem] w-full whitespace-normal px-3 py-2 text-center leading-tight"
                            onClick={() => setTimePreset(p.id)}
                          >
                            {p.label}
                          </Button>
                        ))}
                      </div>
                      {draft.timePreset === "custom" ? (
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="family-share-from">Share from</Label>
                          <Input
                            id="family-share-from"
                            type="date"
                            value={draft.customStart ?? ""}
                            onChange={(e) =>
                              setDraft((d) =>
                                d ? { ...d, customStart: e.target.value } : d
                              )
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        variant={draft.allCategories ? "default" : "outline"}
                        className="w-full"
                        onClick={() =>
                          setDraft((d) =>
                            d ? { ...d, allCategories: !d.allCategories } : d
                          )
                        }
                      >
                        ALL categories
                      </Button>
                      <div
                        className={cn(
                          "grid grid-cols-2 gap-2 sm:grid-cols-3",
                          draft.allCategories && "pointer-events-none opacity-50"
                        )}
                      >
                        {categoryNames.map((name) => {
                          const on = (draft.categories ?? []).includes(name);
                          return (
                            <Button
                              key={name}
                              variant={on ? "default" : "outline"}
                              className="h-auto min-h-[2.75rem] w-full whitespace-normal px-3 py-2 text-center leading-tight"
                              onClick={() => toggleCategory(name)}
                            >
                              {name}
                            </Button>
                          );
                        })}
                      </div>
                      {!draft.allCategories &&
                      (draft.categories ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No categories selected — members will see nothing from
                          each other.
                        </p>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </main>

      {isOwner && dirty ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background p-3">
          <div className="mx-auto max-w-2xl">
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save sharing settings
            </Button>
          </div>
        </div>
      ) : null}

      <AddPartnerDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
