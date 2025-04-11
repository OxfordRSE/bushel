'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginWithFigShare } from '@/lib/auth';
import {FigshareCategory, FigshareLicense, FigshareUser} from "@/lib/types/figshare-api";
import {fetchAllPagesWithConditionalCache} from "@/lib/fetchWithConditionalCache";

type AuthState = {
  token: string | null;
  user: FigshareUser | null;
  impersonationTarget: FigshareUser | null;
  setImpersonationTarget: (user: FigshareUser | null) => void;
  isLoggedIn: boolean;
  login: () => Promise<void>;
  logout: () => void;
  institutionLicenses: FigshareLicense[] | null;
  institutionCategories: FigshareCategory[] | null;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<FigshareUser | null>(null);
  const [impersonationTarget, setImpersonationTarget] = useState<FigshareUser | null>(null);
  const [institutionLicenses, setInstitutionLicenses] = useState<FigshareLicense[] | null>(null);
  const [institutionCategories, setInstitutionCategories] = useState<FigshareCategory[] | null>(null);

  const clear = () => {
    setToken(null);
    setUser(null);
    setImpersonationTarget(null);
    setInstitutionLicenses(null);
    setInstitutionCategories(null);
  }

  const fetchInstitutionLicenses = async (token: string) => {
    await fetchAllPagesWithConditionalCache<FigshareLicense>({
      baseUrl: 'https://api.figshare.com/v2/account/licenses',
      token,
      onPage: (page) => setInstitutionLicenses((prev) => prev ? [...prev, ...page] : page),
    });
  }

  const fetchInstitutionCategories = async (token: string) => {
    await fetchAllPagesWithConditionalCache<FigshareCategory>({
      baseUrl: 'https://api.figshare.com/v2/account/categories',
      token,
      onPage: (page) => setInstitutionCategories((prev) => prev ? [...prev, ...page] : page),
    });
  }

  // Fetch user + token info on mount (via /api/me)
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/me');
      if (!res.ok) {
        clear();
        return;
      }

      const data = await res.json();
      setToken(data.token);
      setUser(data.user);

      fetchInstitutionCategories(data.token);
      fetchInstitutionLicenses(data.token);
    })();
  }, []);

  const login = useCallback(async () => {
    const { token, user } = await loginWithFigShare();
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    clear()
    // Optional: call /api/logout to clear cookie
    fetch('/api/logout', { method: 'POST' }).catch(() => {});
  }, []);

  return (
      <AuthContext.Provider
          value={{ token, user, isLoggedIn: !!user, login, logout, impersonationTarget, setImpersonationTarget, institutionCategories, institutionLicenses}}
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
