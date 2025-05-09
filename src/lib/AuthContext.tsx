'use client';

import {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {loginWithFigShare} from '@/lib/auth';
import {FigshareCategory, FigshareLicense, FigshareUser} from "@/lib/types/figshare-api";
import {useQuery, useQueryClient} from "@tanstack/react-query";

export type AuthState = {
  token: string | null;
  user: FigshareUser | null;
  impersonationTarget: FigshareUser | null;
  setImpersonationTarget: (user: FigshareUser | null) => void;
  isLoggedIn: boolean;
  login: () => Promise<void>;
  logout: () => void;
  institutionLicenses: FigshareLicense[];
  institutionCategories: FigshareCategory[];
  // impersonationTarget if set, otherwise user
  targetUser: FigshareUser | null;
  // Run a fetch query on FigShare with token, impersonation, and caching
  fetch: <T>(url: string | URL, options?: Omit<RequestInit, "body"> & {body?: object}, internal_options?: {returnRawResponse: boolean}) => Promise<T>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<FigshareUser | null>(null);
  const [impersonationTarget, setImpersonationTarget] = useState<FigshareUser | null>(null);
  const queryClient = useQueryClient();

  // Patch GET requests to support Auth and Impersonation
  const patchGET = useCallback((
      url: string | URL,
      headers: HeadersInit = {}
  ): {
    url: typeof url;
    headers: Record<string, string> & { Authorization: `token ${string}` };
  } => {
    // Convert headers to object
    if (Array.isArray(headers)) {
      headers = Object.fromEntries(headers);
    }
    if (headers instanceof Headers) {
      headers = Object.fromEntries(headers.entries());
    }
    const is_URL = url instanceof URL;
    const as_URL = is_URL ? url : new URL(url);
    as_URL.searchParams.set('token', token || '');
    if (impersonationTarget) {
      as_URL.searchParams.set('impersonate', impersonationTarget.id.toString());
    }
    return {
      url: is_URL ? as_URL : as_URL.toString(),
      headers: {...headers, Authorization: `token ${token}`}
    };
  }, [token, impersonationTarget]);

  // Patch POST requests to support Auth and Impersonation
  const patchPOST = useCallback((
      body: object | null = {},
      headers: HeadersInit = {}
  ): {
    body: typeof body & { impersonate?: number };
    headers: Record<string, string> & { Authorization: `token ${string}` };
  } => {
    // Convert headers to object
    if (Array.isArray(headers)) {
      headers = Object.fromEntries(headers);
    }
    if (headers instanceof Headers) {
      headers = Object.fromEntries(headers.entries());
    }
    return {
      body: {
        ...body ?? {},
        impersonate: impersonationTarget ? impersonationTarget.id : undefined,
      },
      headers: {...headers, Authorization: `token ${token}`},
    }
  }, [token, impersonationTarget]);

  const patchedFetch = useCallback(async <T,>(
      url: string | URL,
      options?: Omit<RequestInit, "body"> & {body?: object},
      internal_options?: {returnRawResponse: boolean}
  ): Promise<T> => {
    let query;
    if (options?.method === "POST") {
      const {body, headers} = patchPOST(options?.body, options?.headers);
      query = fetch(url, {...options, body: JSON.stringify(body), headers});
    } else {
      const {url: patchedUrl, headers} = patchGET(url, options?.headers);
      query = fetch(patchedUrl, {...options as RequestInit, headers});
    }
    const response = await query;
    if (internal_options?.returnRawResponse) {
      return response as unknown as T;
    }
    if (!response.ok) {
      let error;
      try {
        error = response.json();
      } catch {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      throw new Error(`Error: ${response.status} ${response.statusText} ${error}`);
    }
    return response.json();
  }, [patchGET, patchPOST]);

  const clear = useCallback(async () => {
    setToken(null);
    setUser(null);
    setImpersonationTarget(null);
    await queryClient.invalidateQueries({queryKey: ['institution']});
  }, [queryClient]);

  const licences = useQuery({
        queryKey: ['institution', 'licenses', impersonationTarget?.id, user?.id],
        enabled: !!token,
        queryFn: async () => {
          const {url, headers} = patchGET('https://api.figshare.com/v2/account/licenses');
          const r = await fetch(url, { headers });
          return await r.json() as FigshareLicense[];
        }
      }
  );

  const categories = useQuery({
    queryKey: ['institution', 'categories', impersonationTarget?.id, user?.id],
    enabled: !!token,
    queryFn: async () => {
      const {url, headers} = patchGET('https://api.figshare.com/v2/account/categories');
      const r = await fetch(url, {headers});
      return await r.json() as FigshareCategory[];
    }
  });

  // Fetch user + token info on mount (via /api/me)
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/me');
      if (!res.ok) {
        await clear();
        return;
      }

      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
    })();
  }, [clear]);

  const login = useCallback(async () => {
    const { token, user } = await loginWithFigShare();
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await clear()
    // Optional: call /api/logout to clear cookie
    await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    // window.location.href = '/';
  }, [clear]);

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
            institutionCategories: categories.data ?? [],
            institutionLicenses: licences.data ?? [],
            targetUser: impersonationTarget ?? user,
            fetch: patchedFetch
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
