'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginWithFigShare } from '@/lib/auth';
import {FigshareUser} from "@/lib/types/figshare-api";

type AuthState = {
  token: string | null;
  user: FigshareUser | null;
  impersonationTarget: FigshareUser | null;
  setImpersonationTarget: (user: FigshareUser | null) => void;
  isLoggedIn: boolean;
  login: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<FigshareUser | null>(null);
    const [impersonationTarget, setImpersonationTarget] = useState<FigshareUser | null>(null);

  // Fetch user + token info on mount (via /api/me)
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/me');
      if (!res.ok) {
        setToken(null);
        setUser(null);
        return;
      }

      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
    })();
  }, []);

  const login = useCallback(async () => {
    const { token, user } = await loginWithFigShare();
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setImpersonationTarget(null);
    // Optional: call /api/logout to clear cookie
    fetch('/api/logout', { method: 'POST' }).catch(() => {});
  }, []);

  return (
      <AuthContext.Provider
          value={{ token, user, isLoggedIn: !!user, login, logout, impersonationTarget, setImpersonationTarget}}
      >
        {children}
      </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
