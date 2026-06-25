"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth";
import { useProfile } from "./profile";
import type {
  Group,
  GroupExpense,
  GroupMember,
  Settlement,
  UserProfile,
} from "./types";

const PENDING_INVITE_KEY = "fintrack_pending_invite";

const groupsCol = () => collection(db, "groups");
const groupRef = (id: string) => doc(db, "groups", id);
const expensesCol = (groupId: string) =>
  collection(db, "groups", groupId, "expenses");

function memberFromProfile(p: UserProfile): GroupMember {
  return { uid: p.uid, name: p.displayName || p.email || "User", phone: p.phone ?? "" };
}

export async function createGroup(owner: UserProfile, name: string) {
  return addDoc(groupsCol(), {
    name,
    ownerUid: owner.uid,
    memberUids: [owner.uid],
    members: [memberFromProfile(owner)],
    createdAt: Date.now(),
  });
}

export async function addMemberToGroup(groupId: string, profile: UserProfile) {
  await updateDoc(groupRef(groupId), {
    memberUids: arrayUnion(profile.uid),
    members: arrayUnion(memberFromProfile(profile)),
  });
}

export async function createInvite(
  groupId: string,
  groupName: string,
  invitedByName: string
) {
  const ref = await addDoc(collection(db, "invites"), {
    groupId,
    groupName,
    invitedByName,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function acceptInvite(code: string, profile: UserProfile) {
  const snap = await getDoc(doc(db, "invites", code));
  if (!snap.exists()) throw new Error("Invite not found");
  const { groupId } = snap.data() as { groupId: string };
  await updateDoc(groupRef(groupId), {
    memberUids: arrayUnion(profile.uid),
    members: arrayUnion(memberFromProfile(profile)),
  });
  return groupId;
}

export async function addGroupExpense(
  groupId: string,
  data: Omit<GroupExpense, "id" | "createdAt">
) {
  return addDoc(expensesCol(groupId), { ...data, createdAt: Date.now() });
}

/** Owner-only (enforced by rules). Removes all expenses, then the group. */
export async function deleteGroup(groupId: string) {
  const snap = await getDocs(expensesCol(groupId));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(groupRef(groupId));
}

/** Soft delete: hidden from balances/totals but kept for the History view. */
export async function softDeleteGroupExpense(groupId: string, id: string) {
  return updateDoc(doc(db, "groups", groupId, "expenses", id), {
    deleted: true,
    deletedAt: Date.now(),
  });
}

/** A settlement is a payment fromUid -> toUid; modelled like a 1-person expense. */
export async function recordSettlement(
  groupId: string,
  data: { fromUid: string; toUid: string; amount: number; createdByUid: string }
) {
  return addDoc(expensesCol(groupId), {
    type: "settlement",
    description: "Settle up",
    amount: data.amount,
    paidByUid: data.fromUid,
    splitAmongUids: [data.toUid],
    date: new Date().toISOString().slice(0, 10),
    createdByUid: data.createdByUid,
    createdAt: Date.now(),
  });
}

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      query(groupsCol(), where("memberUids", "array-contains", user.uid)),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
        rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setGroups(rows);
        setLoading(false);
      },
      (e) => {
        console.error("groups load", e);
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  return { groups, loading };
}

export function useGroupExpenses(groupId: string | null) {
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);

  useEffect(() => {
    if (!groupId) {
      setExpenses([]);
      return;
    }
    const unsub = onSnapshot(
      query(expensesCol(groupId), orderBy("createdAt", "desc")),
      (snap) =>
        setExpenses(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupExpense))
        ),
      (e) => console.error("group expenses", e)
    );
    return unsub;
  }, [groupId]);

  return expenses;
}

/** Consumes a stored invite code once a profile is available (post-login). */
export function useConsumePendingInvite() {
  const { profile } = useProfile();

  useEffect(() => {
    if (!profile) return;
    let code: string | null = null;
    try {
      code = localStorage.getItem(PENDING_INVITE_KEY);
    } catch {
      code = null;
    }
    if (!code) return;

    acceptInvite(code, profile)
      .catch((e) => console.error("pending invite", e))
      .finally(() => {
        try {
          localStorage.removeItem(PENDING_INVITE_KEY);
        } catch {
          /* ignore */
        }
      });
  }, [profile]);
}

/**
 * Net balance between two members from `uid`'s perspective, across expenses and
 * settlements. > 0 => `otherUid` owes `uid` (uid receives); < 0 => uid owes other.
 */
export function pairwiseNet(
  uid: string,
  otherUid: string,
  members: GroupMember[],
  expenses: GroupExpense[]
) {
  const allUids = members.map((m) => m.uid);
  let net = 0;
  for (const e of expenses) {
    if (e.deleted) continue;
    const sharers = e.splitAmongUids.length ? e.splitAmongUids : allUids;
    const share = e.amount / sharers.length;
    if (e.paidByUid === uid && sharers.includes(otherUid)) net += share;
    if (e.paidByUid === otherUid && sharers.includes(uid)) net -= share;
  }
  return net;
}

/**
 * Equal-split balances + minimal settlements (greedy debtor↔creditor match),
 * keyed by member uid. net > 0 => is owed money; net < 0 => owes.
 */
export function computeGroupBalances(
  members: GroupMember[],
  expenses: GroupExpense[]
) {
  const net: Record<string, number> = {};
  for (const m of members) net[m.uid] = 0;

  for (const e of expenses) {
    if (e.deleted) continue;
    const sharers = e.splitAmongUids.length
      ? e.splitAmongUids
      : members.map((m) => m.uid);
    const share = e.amount / sharers.length;
    net[e.paidByUid] = (net[e.paidByUid] ?? 0) + e.amount;
    for (const uid of sharers) net[uid] = (net[uid] ?? 0) - share;
  }

  const nameOf = (uid: string) =>
    members.find((m) => m.uid === uid)?.name ?? "Unknown";

  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0.009)
    .map(([uid, amount]) => ({ uid, amount }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = Object.entries(net)
    .filter(([, v]) => v < -0.009)
    .map(([uid, amount]) => ({ uid, amount: -amount }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    settlements.push({
      from: nameOf(debtors[i].uid),
      to: nameOf(creditors[j].uid),
      amount: Math.round(pay * 100) / 100,
    });
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount <= 0.009) i++;
    if (creditors[j].amount <= 0.009) j++;
  }

  return { net, settlements, nameOf };
}
