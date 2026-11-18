"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearAuthStorage, getTokenExpirationMs } from "../lib/auth-session";
import type { SessionUser } from "../lib/types";

type UserContextValue = {
  session: SessionUser | null;
  ready: boolean;
  setUser: (user: SessionUser | null) => void;
  signOut: () => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem("surgaal-session") ?? sessionStorage.getItem("surgaal-session");
    const token = localStorage.getItem("surgaal-token");
    const expiresAt = token ? getTokenExpirationMs(token) : null;
    if (!savedSession || !expiresAt || expiresAt <= Date.now()) {
      clearAuthStorage();
      // Finish client-side session hydration when no valid session was saved.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
      return;
    }

    try {
      // Restore the saved browser session after hydration.
      setSessionState(JSON.parse(savedSession) as SessionUser);
    } catch {
      clearAuthStorage();
    }
    setReady(true);
  }, []);

  const setUser = useCallback((nextUser: SessionUser | null) => {
    if (nextUser) {
      localStorage.setItem("surgaal-session", JSON.stringify(nextUser));
      setSessionState(nextUser);
      return;
    }

    clearAuthStorage();
    setSessionState(null);
  }, []);

  const signOut = useCallback(() => setUser(null), [setUser]);

  const value = useMemo(() => ({ session, ready, setUser, signOut }), [session, ready, setUser, signOut]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used inside UserProvider");
  return context;
}
