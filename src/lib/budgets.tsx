"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth";
import { useFamily } from "./family";
import type { Budget } from "./types";

const budgetsCol = (uid: string) => collection(db, "users", uid, "budgets");

export async function addBudget(
  uid: string,
  data: Pick<Budget, "category" | "amount">
) {
  const now = Date.now();
  return addDoc(budgetsCol(uid), { ...data, createdAt: now, updatedAt: now });
}

export async function updateBudget(
  uid: string,
  id: string,
  data: Partial<Pick<Budget, "category" | "amount">>
) {
  return updateDoc(doc(db, "users", uid, "budgets", id), {
    ...data,
    updatedAt: Date.now(),
  });
}

/** Budgets are configuration, not financial history — hard delete. */
export async function deleteBudget(uid: string, id: string) {
  return deleteDoc(doc(db, "users", uid, "budgets", id));
}

export function useBudgets() {
  const { user } = useAuth();
  const { family, familyMode, isOwner } = useFamily();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  // A family shares one set of budgets — the owner's — and only the owner may
  // change them. Personal mode always uses your own, fully editable.
  const sourceUid = familyMode && family ? family.ownerUid : user?.uid;
  const canEdit = !familyMode || isOwner;

  useEffect(() => {
    if (!sourceUid) {
      setBudgets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      query(budgetsCol(sourceUid), orderBy("createdAt", "desc")),
      (snap) => {
        setBudgets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Budget)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [sourceUid]);

  return { budgets, loading, uid: sourceUid, canEdit };
}
