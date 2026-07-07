"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  User,
} from "firebase/auth";
import { auth } from "./firebase";
import { usePathname, useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string) => Promise<any>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  signInWithGoogle: async () => {},
});

function goHome() {
  window.location.replace("/");
}

function isLocalDev() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    (async () => {
      // Finish redirect sign-in before treating "no user" as logged out.
      try {
        const result = await getRedirectResult(auth);
        if (mounted && result?.user) setUser(result.user);
      } catch (error) {
        console.error("Google redirect sign-in failed:", error);
      }

      if (!mounted) return;

      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (!mounted) return;
        setUser(firebaseUser);
        setLoading(false);
      });
    })();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === "/login" || pathname === "/signup";

    if (user && isAuthPage) {
      goHome();
    } else if (!user && pathname === "/") {
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  const signIn = async (email: string, pass: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, pass);
    setUser(credential.user);
    goHome();
    return credential;
  };

  const signUp = async (email: string, pass: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, pass);
    setUser(credential.user);
    return credential;
  };

  const signInWithGoogle = async () => {
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });

    // Redirect auth uses authDomain (production). OAuth completes there but
    // tokens are not passed back to localhost — popup works for local dev.
    if (isLocalDev()) {
      const credential = await signInWithPopup(auth, googleProvider);
      setUser(credential.user);
      goHome();
      return;
    }

    await signInWithRedirect(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    router.replace("/login");
  };

  const value = { user, loading, signIn, signUp, signOut, signInWithGoogle };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
