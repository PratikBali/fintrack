"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth";
import { SHARE_ALL_FROM, useFamily } from "./family";
import type { NewTransaction, Transaction } from "./types";

function txnCollection(uid: string) {
  return collection(db, "users", uid, "transactions");
}

/** Firestore rejects `undefined`; omit empty optional fields too. */
function cleanTxnData(data: Record<string, unknown>) {
  const optional = new Set(["category", "txnAppId", "accountId"]);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (optional.has(key) && value === "") continue;
    out[key] = value;
  }
  return out;
}

export async function addTransaction(uid: string, data: NewTransaction) {
  return addDoc(
    txnCollection(uid),
    cleanTxnData({ ...data, createdAt: Date.now() })
  );
}

export async function updateTransaction(
  uid: string,
  id: string,
  data: Partial<NewTransaction>
) {
  return updateDoc(
    doc(db, "users", uid, "transactions", id),
    cleanTxnData(data as Record<string, unknown>)
  );
}

/** Soft delete: hidden from totals/lists but kept for the History view. */
export async function softDeleteTransaction(uid: string, id: string) {
  return updateDoc(doc(db, "users", uid, "transactions", id), {
    deleted: true,
    deletedAt: Date.now(),
  });
}

interface TransactionsContextValue {
  transactions: Transaction[];
  loading: boolean;
}

const TransactionsContext = createContext<TransactionsContextValue>({
  transactions: [],
  loading: true,
});

function byNewest(a: Transaction, b: Transaction) {
  const diff = (b.createdAt ?? 0) - (a.createdAt ?? 0);
  return diff !== 0 ? diff : (b.date ?? "").localeCompare(a.date ?? "");
}

export const TransactionsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const { family, familyMode } = useFamily();
  const [raw, setRaw] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const sharedFrom = family?.share?.sharedFrom ?? SHARE_ALL_FROM;
  // In family mode we read every member's own subcollection; personal mode is
  // just the one. Keyed on uids so renaming a member does not resubscribe.
  const uids = useMemo(() => {
    if (!user) return [] as string[];
    if (!familyMode || !family) return [user.uid];
    return family.memberUids;
  }, [user, familyMode, family]);
  const uidsKey = uids.join(",");

  const nameByUid = useRef<Record<string, string>>({});
  nameByUid.current = Object.fromEntries(
    (family?.members ?? []).map((m) => [m.uid, m.name])
  );

  useEffect(() => {
    if (!user || !uidsKey) {
      setRaw([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const list = uidsKey.split(",");
    const byUid = new Map<string, Transaction[]>();

    const flush = () => {
      const merged: Transaction[] = [];
      for (const rows of byUid.values()) merged.push(...rows);
      merged.sort(byNewest);
      setRaw(merged);
      setLoading(false);
    };

    const unsubs = list.map((uid) => {
      const col = txnCollection(uid);
      // Own data is unrestricted. Another member's data must carry the date
      // constraint, because that is exactly what the security rules require.
      const q =
        uid === user.uid
          ? query(col, orderBy("createdAt", "desc"))
          : query(col, where("date", ">=", sharedFrom), orderBy("date", "desc"));

      return onSnapshot(
        q,
        (snap) => {
          byUid.set(
            uid,
            snap.docs.map(
              (d) =>
                ({
                  id: d.id,
                  ...d.data(),
                  authorUid: uid,
                  authorName: nameByUid.current[uid] ?? "",
                } as Transaction)
            )
          );
          flush();
        },
        (error) => {
          console.error("Failed to load transactions:", error);
          byUid.set(uid, []);
          flush();
        }
      );
    });

    return () => unsubs.forEach((u) => u());
  }, [user, uidsKey, sharedFrom]);

  // Category hiding is a display filter, applied only to other members' rows —
  // you always see everything you recorded yourself.
  const transactions = useMemo(() => {
    if (!familyMode || !family || family.share?.allCategories !== false) {
      return raw;
    }
    const allowed = new Set(family.share.categories ?? []);
    return raw.filter(
      (t) => t.authorUid === user?.uid || allowed.has(t.category ?? "")
    );
  }, [raw, familyMode, family, user]);

  const value = useMemo(
    () => ({ transactions, loading }),
    [transactions, loading]
  );

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactions = () => useContext(TransactionsContext);
