"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, toApiError } from "@/lib/api-client";
import type { User } from "@/lib/types";

interface Session {
  /** `undefined` while the first `GET /auth/me` is in flight, `null` when signed out. */
  user: User | null | undefined;
  setUser: (user: User | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

async function fetchMe(): Promise<User | null> {
  try {
    return await api.get<User>("/auth/me");
  } catch (error) {
    if (toApiError(error).isUnauthorized) return null;
    throw error;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetchMe().then(
      (me) => active && setUser(me),
      () => active && setUser(null),
    );
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      setUser(await fetchMe());
    } catch {
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, setUser, refresh, logout }),
    [user, refresh, logout],
  );
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session)
    throw new Error("useSession must be used inside <SessionProvider>");
  return session;
}
