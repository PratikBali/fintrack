"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { format, startOfMonth, subMonths } from "date-fns";

import { db } from "./firebase";
import { useAuth } from "./auth";
import { useProfile } from "./profile";
import type {
  Family,
  FamilyInvite,
  FamilyMember,
  FamilyRole,
  FamilyShare,
  FamilyTimePreset,
  UserProfile,
  ViewMode,
} from "./types";

export const PENDING_FAMILY_INVITE_KEY = "fintrack_pending_family_invite";
const VIEW_MODE_KEY = "fintrack_view_mode";

/** Sentinel cutoff meaning "share everything ever recorded". */
export const SHARE_ALL_FROM = "0000-01-01";

const familiesCol = () => collection(db, "families");
const familyRef = (id: string) => doc(db, "families", id);
const invitesCol = () => collection(db, "familyInvites");
const inviteRef = (code: string) => doc(db, "familyInvites", code);
const accessRef = (uid: string) =>
  doc(db, "users", uid, "settings", "familyAccess");

export const DEFAULT_FAMILY_SHARE: FamilyShare = {
  timePreset: "all",
  sharedFrom: SHARE_ALL_FROM,
  allCategories: true,
  categories: [],
};

export const FAMILY_TIME_PRESETS: { id: FamilyTimePreset; label: string }[] = [
  { id: "all", label: "All" },
  { id: "month", label: "This month" },
  { id: "3m", label: "Last 3 months" },
  { id: "6m", label: "Last 6 months" },
  { id: "custom", label: "Custom" },
];

/**
 * Collapse a preset into the concrete date that security rules compare against.
 * Rules cannot compute dates, so the cutoff must be stored, not derived.
 */
export function resolveSharedFrom(
  preset: FamilyTimePreset,
  customStart?: string
) {
  if (preset === "all") return SHARE_ALL_FROM;
  const now = new Date();
  if (preset === "custom") {
    return customStart || format(startOfMonth(now), "yyyy-MM-dd");
  }
  const back = preset === "month" ? 0 : preset === "3m" ? 2 : 5;
  return format(startOfMonth(subMonths(now, back)), "yyyy-MM-dd");
}

function memberFromProfile(p: UserProfile, role: FamilyRole): FamilyMember {
  const member: FamilyMember = {
    uid: p.uid,
    name: p.displayName || p.email || "User",
    email: p.email ?? "",
    role,
    joinedAt: Date.now(),
  };
  if (p.phone) member.phone = p.phone;
  if (p.photoURL) member.photoURL = p.photoURL;
  return member;
}

// ---- Invites ----

/** Owner creates a single-use link. familyId is absent until first approval. */
export async function createFamilyInvite(
  owner: UserProfile,
  familyId?: string
) {
  const payload: Record<string, unknown> = {
    ownerUid: owner.uid,
    ownerName: owner.displayName || owner.email || "A FinTrack user",
    status: "pending",
    createdAt: Date.now(),
  };
  if (familyId) payload.familyId = familyId;
  const ref = await addDoc(invitesCol(), payload);
  return ref.id;
}

export async function getFamilyInvite(code: string) {
  const snap = await getDoc(inviteRef(code));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FamilyInvite;
}

/** Invitee accepts: stamps their Google identity on the invite for owner review. */
export async function acceptFamilyInvite(code: string, profile: UserProfile) {
  await updateDoc(inviteRef(code), {
    status: "accepted",
    inviteeUid: profile.uid,
    inviteeName: profile.displayName || profile.email || "Member",
    inviteeEmail: profile.email ?? "",
    // Phone is optional; empty means the invitee has not shared one.
    inviteePhone: profile.phone ?? "",
    acceptedAt: Date.now(),
  });
}

export async function declineFamilyInvite(code: string, profile: UserProfile) {
  await updateDoc(inviteRef(code), {
    status: "declined",
    inviteeUid: profile.uid,
    decidedAt: Date.now(),
  });
}

/**
 * Owner's half of the handshake. Creates the family on first approval, then
 * adds the invitee as a member. Both sides have now agreed.
 */
export async function approveFamilyInvite(
  code: string,
  owner: UserProfile,
  existingFamilyId?: string
) {
  const invite = await getFamilyInvite(code);
  if (!invite) throw new Error("Invite not found");
  if (invite.ownerUid !== owner.uid) throw new Error("Not your invite");
  if (invite.status !== "accepted") throw new Error("Invite is not awaiting approval");
  if (!invite.inviteeUid) throw new Error("Invite has no member yet");

  const member: FamilyMember = {
    uid: invite.inviteeUid,
    name: invite.inviteeName || "Member",
    email: invite.inviteeEmail ?? "",
    role: "member",
    joinedAt: Date.now(),
  };
  if (invite.inviteePhone) member.phone = invite.inviteePhone;

  let familyId = existingFamilyId ?? invite.familyId;
  if (familyId) {
    await updateDoc(familyRef(familyId), {
      memberUids: arrayUnion(member.uid),
      members: arrayUnion(member),
    });
  } else {
    const ref = await addDoc(familiesCol(), {
      ownerUid: owner.uid,
      memberUids: [owner.uid, member.uid],
      members: [memberFromProfile(owner, "owner"), member],
      share: DEFAULT_FAMILY_SHARE,
      createdAt: Date.now(),
    });
    familyId = ref.id;
  }

  await updateDoc(inviteRef(code), {
    status: "approved",
    familyId,
    decidedAt: Date.now(),
  });
  return familyId;
}

/** Owner rejects: nothing is added and the link is spent, so they can re-invite. */
export async function rejectFamilyInvite(code: string) {
  await updateDoc(inviteRef(code), {
    status: "rejected",
    decidedAt: Date.now(),
  });
}

// ---- Family document ----

export async function removeFamilyMember(family: Family, uid: string) {
  if (uid === family.ownerUid) throw new Error("The owner cannot be removed");
  await updateDoc(familyRef(family.id), {
    memberUids: family.memberUids.filter((u) => u !== uid),
    members: family.members.filter((m) => m.uid !== uid),
  });
}

export async function saveFamilyShare(familyId: string, share: FamilyShare) {
  await updateDoc(familyRef(familyId), {
    share: { ...share, updatedAt: Date.now() },
  });
}

// ---- Context ----

interface FamilyContextValue {
  family: Family | null;
  loading: boolean;
  isOwner: boolean;
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  /** Aggregate across the family right now (needs a family AND family mode). */
  familyMode: boolean;
}

const FamilyContext = createContext<FamilyContextValue>({
  family: null,
  loading: true,
  isOwner: false,
  mode: "personal",
  setMode: () => {},
  familyMode: false,
});

function readStoredMode(): ViewMode {
  if (typeof window === "undefined") return "personal";
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === "family"
      ? "family"
      : "personal";
  } catch {
    return "personal";
  }
}

export const FamilyProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setModeState] = useState<ViewMode>("personal");

  useEffect(() => {
    setModeState(readStoredMode());
  }, []);

  useEffect(() => {
    if (!user) {
      setFamily(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      query(familiesCol(), where("memberUids", "array-contains", user.uid)),
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Family)
        );
        rows.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        setFamily(rows[0] ?? null);
        setLoading(false);
      },
      (e) => {
        console.error("family load", e);
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  const setMode = useCallback((next: ViewMode) => {
    setModeState(next);
    try {
      localStorage.setItem(VIEW_MODE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useFamilyAccessMirror(family);

  const value = useMemo(() => {
    const isOwner = !!family && !!user && family.ownerUid === user.uid;
    return {
      family,
      loading,
      isOwner,
      mode,
      setMode,
      familyMode: !!family && mode === "family",
    };
  }, [family, loading, user, mode, setMode]);

  return (
    <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
  );
};

export const useFamily = () => useContext(FamilyContext);

/**
 * Keeps users/{uid}/settings/familyAccess in step with the family policy.
 * Each member writes only their own mirror, which is what lets security rules
 * authorise family reads of that member's data without cross-path writes.
 */
function useFamilyAccessMirror(family: Family | null) {
  const { user } = useAuth();
  const lastWritten = useRef<string>("");

  const desired = useMemo(() => {
    if (!family) {
      return { familyId: "", memberUids: [] as string[], sharedFrom: SHARE_ALL_FROM };
    }
    return {
      familyId: family.id,
      memberUids: family.memberUids,
      sharedFrom: family.share?.sharedFrom ?? SHARE_ALL_FROM,
    };
  }, [family]);

  useEffect(() => {
    if (!user) {
      lastWritten.current = "";
      return;
    }
    const fingerprint = JSON.stringify(desired);
    if (lastWritten.current === fingerprint) return;

    // One read to avoid a pointless write on every session start.
    getDoc(accessRef(user.uid))
      .then((snap) => {
        const current = snap.exists() ? snap.data() : null;
        const same =
          current &&
          current.familyId === desired.familyId &&
          current.sharedFrom === desired.sharedFrom &&
          JSON.stringify(current.memberUids ?? []) ===
            JSON.stringify(desired.memberUids);
        if (same) {
          lastWritten.current = fingerprint;
          return;
        }
        return setDoc(accessRef(user.uid), desired, { merge: true }).then(() => {
          lastWritten.current = fingerprint;
        });
      })
      .catch((e) => console.error("family access mirror", e));
  }, [user, desired]);
}

/** Every invite this user sent, newest first. Volume is tiny, so no index. */
export function useMyOutgoingInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<FamilyInvite[]>([]);

  useEffect(() => {
    if (!user) {
      setInvites([]);
      return;
    }
    const unsub = onSnapshot(
      query(invitesCol(), where("ownerUid", "==", user.uid)),
      (snap) => {
        const rows = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as FamilyInvite)
        );
        rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setInvites(rows);
      },
      (e) => console.error("family invites", e)
    );
    return unsub;
  }, [user]);

  const pending = useMemo(
    () => invites.filter((i) => i.status === "pending"),
    [invites]
  );
  const awaitingApproval = useMemo(
    () => invites.filter((i) => i.status === "accepted"),
    [invites]
  );

  return { invites, pending, awaitingApproval };
}

/** Resolves the pending invite code stashed before the login round-trip. */
export function readPendingFamilyInvite() {
  try {
    return localStorage.getItem(PENDING_FAMILY_INVITE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingFamilyInvite() {
  try {
    localStorage.removeItem(PENDING_FAMILY_INVITE_KEY);
  } catch {
    /* ignore */
  }
}

export function stashPendingFamilyInvite(code: string) {
  try {
    localStorage.setItem(PENDING_FAMILY_INVITE_KEY, code);
  } catch {
    /* ignore */
  }
}

/**
 * Login sends everyone to "/", so bounce back to a stashed invite. The join
 * page clears the stash as soon as it shows the accept/decline choice, which
 * keeps this from looping.
 */
export function useResumePendingFamilyInvite() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const code = readPendingFamilyInvite();
    if (code) router.replace(`/family/join/${code}`);
  }, [user, router]);
}

/** Convenience for callers that only need the current user's own profile row. */
export function useMyFamilyMember() {
  const { family } = useFamily();
  const { profile } = useProfile();
  return useMemo(() => {
    if (!family || !profile) return null;
    return family.members.find((m) => m.uid === profile.uid) ?? null;
  }, [family, profile]);
}
