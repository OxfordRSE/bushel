'use client';

import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { FigshareUser } from '@/lib/types/figshare-api';
import StepPanel from '@/components/steps/StepPanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { fetchAllPagesWithConditionalCache } from '@/lib/fetchWithConditionalCache';
import {UserX} from "lucide-react";
import {clsx} from "clsx";
import {FigshareAPIError} from "@/lib/utils";

const EMAIL_REGEX = /^\w+@\w+\.\w+$/;
const DISPLAY_PAGE_SIZE = 20;

export default function ImpersonationStep({ openByDefault = false, onSelect }: { openByDefault?: boolean, onSelect?: () => void }) {
  const { isLoggedIn, user, impersonationTarget, setImpersonationTarget, token } = useAuth();
  const [searchMode, setSearchMode] = useState<'email' | 'name'>('email');
  const [search, setSearch] = useState('');
  const [displayPage, setDisplayPage] = useState(1);
  const [allUsers, setAllUsers] = useState<FigshareUser[]>([]);
  const [emailMatch, setEmailMatch] = useState<FigshareUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setDisplayPage(1);
  }, [search, searchMode]);

  const fetchUsers = () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setAllUsers([]);

    fetchAllPagesWithConditionalCache<FigshareUser>({
      baseUrl: 'https://api.figshare.com/v2/account/institution/accounts',
      token,
      onPage: (newUsers) => {
        setAllUsers(prev => [...prev, ...newUsers].filter(u => u.id !== user?.id));
      }
    }).catch((err: Error|unknown) => {
      setError(
          err instanceof Error
              ? err instanceof FigshareAPIError
                  ? err.details
                  : err.message
              : 'Failed to load users'
      );
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchUsers();
  }, [token, reloadKey]);

  useEffect(() => {
    if (!token || !EMAIL_REGEX.test(search)) {
      setEmailMatch(null);
      return;
    }
    fetch(`https://api.figshare.com/v2/account/institution/accounts?email=${search}`, {
      headers: { Authorization: `token ${token}` },
    })
        .then(res => res.ok ? res.json() : Promise.resolve([]))
        .then(arr => setEmailMatch(arr[0] || null))
        .catch(() => setEmailMatch(null));
  }, [search, token]);

  const filtered = search
      ? allUsers.filter(u => {
            if (searchMode === 'name') {
              return u.first_name.toLowerCase().includes(search.toLowerCase()) ||
                  u.last_name.toLowerCase().includes(search.toLowerCase())
            } else {
              return u.email.toLowerCase().includes(search.toLowerCase());
            }
          }
      )
      : allUsers;

  const displayUsers = emailMatch
      ? [emailMatch, ...filtered.filter(u => u.id !== emailMatch.id)]
      : filtered;

  const totalDisplayPages = Math.ceil(displayUsers.length / DISPLAY_PAGE_SIZE);
  const paginatedDisplay = displayUsers.slice(
      (displayPage - 1) * DISPLAY_PAGE_SIZE,
      displayPage * DISPLAY_PAGE_SIZE
  );

  const summary =
      error
          ? <span className="text-red-600">Error fetching group list: {error}</span>
          : impersonationTarget
              ? <span className="text-muted-foreground">Impersonating {impersonationTarget.first_name} {impersonationTarget.last_name}</span>
              : <span>Acting as myself</span>;

  return (
      <StepPanel
          title={summary}
          status={
            error
                ? 'error'
                : isLoggedIn
                    ? 'complete'
                    : 'default'
          }
          openByDefault={openByDefault}
      >
        <div className="space-y-3">
          {impersonationTarget && <div>
            <Button
                variant="outline"
                onClick={() => {
                  setImpersonationTarget(null);
                  onSelect?.();
                }}
                className="mb-2 cursor-pointer"
            >
              <UserX /> Stop impersonating {impersonationTarget.first_name} {impersonationTarget.last_name}
            </Button>
          </div>}
          <div className="flex gap-2 items-end">
            <div className="w-48">
              <label className="block text-sm font-medium mb-1">Search mode</label>
              <Select value={searchMode} onValueChange={v => setSearchMode(v as 'email' | 'name')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Search</label>
              <Input
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setDisplayPage(1);
                  }}
                  placeholder={searchMode === 'email' ? 'user@example.com' : 'Zebidie'}
              />
            </div>
          </div>

          {loading && (
              <p className="text-sm text-muted-foreground">Loading users…</p>
          )}
          {error && (
              <div className="text-sm text-red-600 space-y-2">
                <p>Error: {error}</p>
                <Button variant="outline" onClick={() => setReloadKey(reloadKey + 1)}>Retry</Button>
              </div>
          )}

          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm items-center">
            {paginatedDisplay.map(u => (
                <li
                    key={u.id}
                    className="flex"
                >
                  <Button
                      variant="ghost"
                      onClick={() => {
                        setImpersonationTarget(u)
                        onSelect?.()
                      }}
                      className={clsx([
                        "w-full h-fit text-left flex flex-col items-start whitespace-normal break-words p-4 border rounded cursor-pointer",
                        { "bg-muted": impersonationTarget?.id === u.id }
                      ])}
                  >
                    {u.first_name} {u.last_name}<br />
                    <span className="text-muted-foreground text-xs">{u.email}</span>
                  </Button>
                </li>
            ))}
          </ul>

          <div className="flex justify-between text-sm text-muted-foreground pt-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setDisplayPage(p => Math.max(1, p - 1))}
                disabled={displayPage === 1}
                className="cursor-pointer"
            >
              Previous
            </Button>
            <span>Page {displayPage} of {totalDisplayPages}</span>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setDisplayPage(p => Math.min(totalDisplayPages, p + 1))}
                disabled={displayPage >= totalDisplayPages}
                className="cursor-pointer"
            >
              Next
            </Button>
          </div>
        </div>
      </StepPanel>
  );
}
