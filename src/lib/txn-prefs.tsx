"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth";
import type {
  PaymentAccount,
  TransactionPrefs,
  TxnAppOption,
} from "./types";

const EMPTY: TransactionPrefs = { apps: [], accounts: [] };

const prefsRef = (uid: string) =>
  doc(db, "users", uid, "settings", "transactionPrefs");

export async function saveTxnPrefs(uid: string, prefs: TransactionPrefs) {
  await setDoc(prefsRef(uid), prefs, { merge: true });
}

export function newId() {
  return crypto.randomUUID();
}

export function useTxnPrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<TransactionPrefs>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPrefs(EMPTY);
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
      prefsRef(user.uid),
      (snap) => {
        const data = snap.data() as TransactionPrefs | undefined;
        setPrefs({
          apps: data?.apps ?? [],
          accounts: data?.accounts ?? [],
        });
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user]);

  const persist = async (next: TransactionPrefs) => {
    if (!user) return;
    await saveTxnPrefs(user.uid, next);
  };

  const saveApps = (apps: TxnAppOption[]) =>
    persist({ ...prefs, apps });

  const saveAccounts = (accounts: PaymentAccount[]) =>
    persist({ ...prefs, accounts });

  return { prefs, loading, saveApps, saveAccounts };
}
