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

function mergeDefaultCategories(existing: CategoryOption[]): CategoryOption[] {
  const names = new Set(existing.map((c) => c.name));
  const missing = DEFAULT_CATEGORY_OPTIONS.filter((d) => !names.has(d.name));
  return missing.length ? [...existing, ...missing] : existing;
}

function normalizePrefs(data?: TransactionPrefs): TransactionPrefs {
  const raw = data?.categories?.length ? data.categories : DEFAULT_CATEGORY_OPTIONS;
  return {
    apps: data?.apps ?? [],
    accounts: data?.accounts ?? [],
    categories: mergeDefaultCategories(raw),
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
        if (user && data) {
          const merged = mergeDefaultCategories(data.categories ?? []);
          if (
            !data.categories?.length ||
            merged.length !== (data.categories?.length ?? 0)
          ) {
            saveTxnPrefs(user.uid, { ...next, categories: merged }).catch(
              console.error
            );
          }
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
