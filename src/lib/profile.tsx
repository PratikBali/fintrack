"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { useAuth } from "./auth";
import { normalizePhone } from "./messaging";
import type { UserProfile } from "./types";

const profileRef = (uid: string) => doc(db, "profiles", uid);

function nameFromUser(user: User) {
  if (user.displayName) return user.displayName;
  if (user.email) return user.email.split("@")[0];
  return "User";
}

/** Mirror the auth user into a searchable profile. Never clobbers an existing phone. */
export async function upsertProfile(user: User, extra?: { phone?: string }) {
  const data: Record<string, unknown> = {
    uid: user.uid,
    email: (user.email ?? "").toLowerCase(),
    displayName: nameFromUser(user),
    photoURL: user.photoURL ?? "",
    updatedAt: Date.now(),
  };
  const phone = extra?.phone ? normalizePhone(extra.phone) : "";
  if (phone) data.phone = phone;
  await setDoc(profileRef(user.uid), data, { merge: true });
}

export async function updateMyPhone(uid: string, phone: string) {
  await setDoc(profileRef(uid), { phone: normalizePhone(phone) }, { merge: true });
}

/** Find FinTrack members by exact phone or email. */
export async function searchProfiles(term: string): Promise<UserProfile[]> {
  const t = term.trim();
  if (!t) return [];
  const results = new Map<string, UserProfile>();

  const phone = normalizePhone(t);
  if (phone.length >= 10) {
    const snap = await getDocs(
      query(collection(db, "profiles"), where("phone", "==", phone), limit(5))
    );
    snap.forEach((d) => results.set(d.id, d.data() as UserProfile));
  }
  if (t.includes("@")) {
    const snap = await getDocs(
      query(
        collection(db, "profiles"),
        where("email", "==", t.toLowerCase()),
        limit(5)
      )
    );
    snap.forEach((d) => results.set(d.id, d.data() as UserProfile));
  }
  return Array.from(results.values());
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      profileRef(user.uid),
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user]);

  return { profile, loading };
}

/** Mounted once (in layout) to keep the profile mirror in sync after any login. */
export function ProfileSync() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) upsertProfile(user).catch((e) => console.error("profile sync", e));
  }, [user]);
  return null;
}
