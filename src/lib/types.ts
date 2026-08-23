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
  // Attached client-side in family mode from the owning path; never stored.
  authorUid?: string;
  authorName?: string;
}

export type NewTransaction = Omit<
  Transaction,
  "id" | "createdAt" | "authorUid" | "authorName"
>;

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

export type CategoryGroup = "consumable" | "material";

export interface CategoryOption {
  id: string;
  name: string;
  group?: CategoryGroup;
}

export interface TransactionPrefs {
  apps: TxnAppOption[];
  accounts: PaymentAccount[];
  categories?: CategoryOption[];
  defaultAppId?: string;
  defaultAccountId?: string;
  // Default category is remembered separately per group (stored by name).
  defaultConsumableCategory?: string;
  defaultMaterialCategory?: string;
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

// ---- Family (one household sharing expense data) ----

export type FamilyRole = "owner" | "member";

export type FamilyTimePreset = "all" | "month" | "3m" | "6m" | "custom";

export interface FamilyMember {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  role: FamilyRole;
  joinedAt: number;
}

/** Owner-managed policy for how far back and which categories members may see. */
export interface FamilyShare {
  timePreset: FamilyTimePreset;
  // Resolved cutoff date (yyyy-MM-dd). Denormalized so Firestore rules can
  // compare it directly without recomputing the preset.
  sharedFrom: string;
  customStart?: string;
  allCategories: boolean;
  categories: string[];
  updatedAt?: number;
}

export interface Family {
  id: string;
  ownerUid: string;
  memberUids: string[];
  members: FamilyMember[];
  share: FamilyShare;
  createdAt?: number;
}

export type FamilyInviteStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "approved"
  | "rejected";

export interface FamilyInvite {
  id: string;
  familyId?: string;
  ownerUid: string;
  ownerName: string;
  status: FamilyInviteStatus;
  inviteeUid?: string;
  inviteeName?: string;
  inviteeEmail?: string;
  inviteePhone?: string;
  createdAt?: number;
  acceptedAt?: number;
  decidedAt?: number;
}

/**
 * Mirror of the family policy at users/{uid}/settings/familyAccess. Each member
 * writes their own copy so security rules can authorise a cross-member read
 * with a single get() — no user ever writes into another user's path.
 */
export interface FamilyAccess {
  familyId: string;
  memberUids: string[];
  sharedFrom: string;
}

/** Personal = only my own records. Family = every member's shared records. */
export type ViewMode = "personal" | "family";
