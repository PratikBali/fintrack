"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth";
import { DEFAULT_CATEGORY_OPTIONS } from "./data";
import type {
  CategoryOption,
  PaymentAccount,
  TransactionPrefs,
  TxnAppOption,
} from "./types";

const EMPTY: TransactionPrefs = {
  apps: [],
  accounts: [],
  categories: [],
};

const prefsRef = (uid: string) =>
  doc(db, "users", uid, "settings", "transactionPrefs");

export async function saveTxnPrefs(uid: string, prefs: TransactionPrefs) {
  await setDoc(prefsRef(uid), prefs, { merge: true });
}

export function newId() {
  return crypto.randomUUID();
}

function normalizePrefs(data?: TransactionPrefs): TransactionPrefs {
  return {
    apps: data?.apps ?? [],
    accounts: data?.accounts ?? [],
    categories: data?.categories?.length
      ? data.categories
      : DEFAULT_CATEGORY_OPTIONS,
  };
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
        const next = normalizePrefs(data);
        setPrefs(next);
        setLoading(false);
        // Seed default categories once for new users.
        if (user && data && !data.categories?.length) {
          saveTxnPrefs(user.uid, { ...next, categories: DEFAULT_CATEGORY_OPTIONS }).catch(
            console.error
          );
        }
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user]);

  const persist = async (next: TransactionPrefs) => {
    if (!user) return;
    await saveTxnPrefs(user.uid, next);
  };

  const saveApps = (apps: TxnAppOption[]) => persist({ ...prefs, apps });

  const saveAccounts = (accounts: PaymentAccount[]) =>
    persist({ ...prefs, accounts });

  const saveCategories = (categories: CategoryOption[]) =>
    persist({ ...prefs, categories });

  return {
    prefs,
    loading,
    saveApps,
    saveAccounts,
    saveCategories,
  };
}
