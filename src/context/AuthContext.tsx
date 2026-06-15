import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type User
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db, googleProvider } from "../services/firebase";

declare global {
  interface Window {
    TejaAndroid?: {
      signInWithGoogle?: (callbackId: string) => void;
      initiateCall?: (phoneNumber: string) => void;
      getContacts?: () => string;
      syncContacts?: () => void;
      showToast?: (message: string) => void;
      isNotificationListenerEnabled?: () => boolean;
      openNotificationSettings?: () => void;
    };
    __tejaAndroidAuthResult?: (
      callbackId: string,
      result: { idToken?: string; error?: string }
    ) => void;
  }
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const nativeAuthCallbacks = new Map<string, (result: { idToken?: string; error?: string }) => void>();

window.__tejaAndroidAuthResult = (callbackId, result) => {
  const callback = nativeAuthCallbacks.get(callbackId);
  if (!callback) return;
  nativeAuthCallbacks.delete(callbackId);
  callback(result);
};

async function loginWithNativeGoogle(): Promise<boolean> {
  if (!window.TejaAndroid?.signInWithGoogle) {
    return false;
  }

  const callbackId = `google_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const result = await new Promise<{ idToken?: string; error?: string }>((resolve) => {
    nativeAuthCallbacks.set(callbackId, resolve);
    window.TejaAndroid?.signInWithGoogle?.(callbackId);
  });

  if (result.error) {
    throw new Error(result.error);
  }

  if (!result.idToken) {
    throw new Error("Google sign-in did not return an ID token");
  }

  const credential = GoogleAuthProvider.credential(result.idToken);
  await signInWithCredential(auth, credential);
  return true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            lastLoginAt: serverTimestamp()
          },
          { merge: true }
        );
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      loginWithGoogle: async () => {
        if (await loginWithNativeGoogle()) {
          return;
        }
        await signInWithPopup(auth, googleProvider);
      },
      logout: () => signOut(auth)
    }),
    [loading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
