import type { LucideIcon } from "lucide-react";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  amount: number;
  vendor: string;
  item: string;
  category?: string;
  type: TransactionType;
  date: string; // ISO date (yyyy-MM-dd)
  notes?: string;
  txnAppId?: string;
  accountId?: string;
  createdAt?: number; // epoch ms, for ordering
  deleted?: boolean; // soft-deleted: kept in History, excluded from totals
  deletedAt?: number;
}

export type NewTransaction = Omit<Transaction, "id" | "createdAt">;

export type AccountType = "bank" | "credit_card";

export interface TxnAppOption {
  id: string;
  name: string;
}

export interface PaymentAccount {
  id: string;
  name: string;
  type: AccountType;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface TransactionPrefs {
  apps: TxnAppOption[];
  accounts: PaymentAccount[];
  categories?: CategoryOption[];
}

export interface Category {
  name: string;
  icon: LucideIcon;
}

// ---- Budgets (monthly spending limit per category) ----

export interface Budget {
  id: string;
  category: string; // matches Transaction.category
  amount: number; // monthly limit
  createdAt?: number;
  updatedAt?: number;
}

// ---- Ledger (money you'll get / you'll give) ----

export type ContactType = "vendor" | "dealer" | "friend" | "other";
// "get" = You'll Get (they owe you); "give" = You'll Give (you owe them)
export type LedgerDirection = "get" | "give";

export interface Contact {
  id: string;
  name: string;
  type: ContactType;
  phone?: string;
  createdAt?: number;
}

export interface LedgerEntry {
  id: string;
  contactId: string;
  contactName: string;
  amount: number;
  direction: LedgerDirection;
  note?: string;
  date: string;
  createdAt?: number;
  deleted?: boolean;
  deletedAt?: number;
}

export interface ContactBalance {
  contact: Contact;
  balance: number; // > 0 => You'll Get; < 0 => You'll Give
}

// ---- Users / profiles (for friend discovery) ----

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  photoURL?: string;
  updatedAt?: number;
}

// ---- Group expenses (shared across FinTrack members) ----

export interface GroupMember {
  uid: string;
  name: string;
  phone?: string;
}

export interface Group {
  id: string;
  name: string;
  ownerUid: string;
  memberUids: string[];
  members: GroupMember[];
  createdAt?: number;
}

// Stored as a subcollection under groups/{groupId}/expenses.
// A "settlement" is a payment from paidByUid -> splitAmongUids[0].
export interface GroupExpense {
  id: string;
  type?: "expense" | "settlement";
  description: string;
  amount: number;
  paidByUid: string;
  splitAmongUids: string[];
  date: string;
  createdByUid?: string;
  createdAt?: number;
  deleted?: boolean;
  deletedAt?: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}
