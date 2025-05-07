'use client';

import {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {loginWithFigShare} from '@/lib/auth';
import {FigshareCategory, FigshareLicense, FigshareUser} from "@/lib/types/figshare-api";
import {fetchAllPagesWithConditionalCache, fetchWithConditionalCache} from "@/lib/fetchWithConditionalCache";

export type AuthState = {
  token: string | null;
  user: FigshareUser | null;
  impersonationTarget: FigshareUser | null;
  setImpersonationTarget: (user: FigshareUser | null) => void;
  isLoggedIn: boolean;
  login: () => Promise<void>;
  logout: () => void;
  institutionLicenses: FigshareLicense[] | null;
  institutionCategories: FigshareCategory[] | null;
  // impersonationTarget if set, otherwise user
  targetUser: FigshareUser | null;
  // Run a fetch query on FigShare with token, impersonation, and caching
  fsFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<T>;
  fsFetchPaginated: <T = unknown>(url: string, onPage: (data: T[]) => void, options?: RequestInit, pageSize?: number) => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<FigshareUser | null>(null);
  const [impersonationTarget, setImpersonationTarget] = useState<FigshareUser | null>(null);
  const [institutionLicenses, setInstitutionLicenses] = useState<FigshareLicense[] | null>(null);
  const [institutionCategories, setInstitutionCategories] = useState<FigshareCategory[] | null>(null);

  const prepQuery = useCallback((url: string|URL, options: RequestInit) => {
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `token ${token}`);
    if (impersonationTarget) {
      if (options.method && options.method.toUpperCase() === 'POST') {
        options.body = JSON.stringify(
            {
              ...JSON.parse(options.body as string),
              impersonate: impersonationTarget.id,
            }
        );
      } else {
        url = new URL(url);
        url.searchParams.set('impersonate', impersonationTarget.id.toString());
      }
    }
    return {url, options: {...options, headers}};
  }, [token, impersonationTarget]);

  const fsFetch = useCallback(async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
    const query = prepQuery(url, options);
    return await fetchWithConditionalCache(query.url.toString(), query.options);
  }, [prepQuery]);

  const fsFetchPaginated = useCallback(async <T,>(url: string, onPage: (data: T[]) => void, options: RequestInit = {}, pageSize = 100) => {
    const query = prepQuery(url, options);
    return await fetchAllPagesWithConditionalCache(query.url.toString(), query.options, onPage, pageSize);
  }, [prepQuery]);

  const clear = () => {
    setToken(null);
    setUser(null);
    setImpersonationTarget(null);
    setInstitutionLicenses(null);
    setInstitutionCategories(null);
  }

  const fetchInstitutionLicenses = async (token: string) => {
    const licenses = await fsFetch<FigshareLicense[]>('https://api.figshare.com/v2/account/licenses',{
      headers: { Authorization: `token ${token}` }
    });
    setInstitutionLicenses(licenses);
  }

  const fetchInstitutionCategories = async (token: string) => {
    const categories = await fsFetch<FigshareCategory[]>('https://api.figshare.com/v2/account/categories',{
      headers: { Authorization: `token ${token}` }
    });
    setInstitutionCategories(categories);
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

  const logout = useCallback(async () => {
    clear()
    // Optional: call /api/logout to clear cookie
    await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/';
  }, []);

  return (
      <AuthContext.Provider
          value={{
            token,
            user,
            isLoggedIn: !!user,
            login,
            logout,
            impersonationTarget,
            setImpersonationTarget,
            institutionCategories,
            institutionLicenses,
            targetUser: impersonationTarget ?? user,
            fsFetch,
            fsFetchPaginated,
          }}
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
