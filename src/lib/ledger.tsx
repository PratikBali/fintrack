"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { Contact, ContactBalance, LedgerEntry } from "./types";

const contactsCol = (uid: string) => collection(db, "users", uid, "contacts");
const ledgerCol = (uid: string) => collection(db, "users", uid, "ledger");

export async function addContact(
  uid: string,
  data: Omit<Contact, "id" | "createdAt">
) {
  return addDoc(contactsCol(uid), { ...data, createdAt: Date.now() });
}

export async function addLedgerEntry(
  uid: string,
  data: Omit<LedgerEntry, "id" | "createdAt">
) {
  return addDoc(ledgerCol(uid), { ...data, createdAt: Date.now() });
}

/** Soft delete: hidden from balances but kept for the History view. */
export async function softDeleteLedgerEntry(uid: string, id: string) {
  return updateDoc(doc(db, "users", uid, "ledger", id), {
    deleted: true,
    deletedAt: Date.now(),
  });
}

export function useLedger() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setContacts([]);
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubContacts = onSnapshot(
      query(contactsCol(user.uid), orderBy("createdAt", "desc")),
      (snap) =>
        setContacts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Contact)))
    );
    const unsubEntries = onSnapshot(
      query(ledgerCol(user.uid), orderBy("createdAt", "desc")),
      (snap) => {
        setEntries(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as LedgerEntry))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => {
      unsubContacts();
      unsubEntries();
    };
  }, [user]);

  const balances = useMemo<ContactBalance[]>(() => {
    const totals = new Map<string, number>();
    for (const e of entries) {
      if (e.deleted) continue;
      const delta = e.direction === "get" ? e.amount : -e.amount;
      totals.set(e.contactId, (totals.get(e.contactId) ?? 0) + delta);
    }
    return contacts.map((c) => ({ contact: c, balance: totals.get(c.id) ?? 0 }));
  }, [contacts, entries]);

  const totals = useMemo(() => {
    let willGet = 0;
    let willGive = 0;
    for (const b of balances) {
      if (b.balance > 0) willGet += b.balance;
      else if (b.balance < 0) willGive += -b.balance;
    }
    return { willGet, willGive };
  }, [balances]);

  return { contacts, entries, balances, totals, loading, uid: user?.uid };
}
