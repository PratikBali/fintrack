"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth";
import type { NewTransaction, Transaction } from "./types";

function txnCollection(uid: string) {
  return collection(db, "users", uid, "transactions");
}

export async function addTransaction(uid: string, data: NewTransaction) {
  return addDoc(txnCollection(uid), { ...data, createdAt: Date.now() });
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

export const TransactionsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(txnCollection(user.uid), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setTransactions(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction))
        );
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load transactions:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

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
