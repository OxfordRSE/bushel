'use client';

import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { FigshareGroup } from '@/lib/types/figshare-api';
import StepPanel from '@/components/steps/StepPanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {clsx} from "clsx";
import {useGroup} from "@/lib/GroupContext";
import {useQuery} from "@tanstack/react-query";

const DISPLAY_PAGE_SIZE = 20;

export default function GroupPicker({ openByDefault = false, onSelect }: { openByDefault?: boolean, onSelect?: () => void }) {
  const { token, fetch, impersonationTarget } = useAuth();
  const [search, setSearch] = useState('');
  const [displayPage, setDisplayPage] = useState(1);
  const {group, setGroup, fields} = useGroup();
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setDisplayPage(1);
  }, [search]);

  const {data: allGroups, isFetching, error} = useQuery({
    queryKey: ['groups', token, reloadKey, impersonationTarget?.id],
    queryFn: async () => {
      return await fetch<FigshareGroup[]>(`https://api.figshare.com/v2/account/institution/groups`);
    },
    enabled: !!token,
  });

  const filtered = search
      ? allGroups?.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
      : allGroups;

  const totalDisplayPages = Math.ceil(filtered?.length ?? 1 / DISPLAY_PAGE_SIZE);
  const paginatedDisplay = filtered?.slice(
      (displayPage - 1) * DISPLAY_PAGE_SIZE,
      displayPage * DISPLAY_PAGE_SIZE
  );

  const summary =
      error
          ? <span className="text-red-600">Error fetching groups: {error.message}</span>
          : group
              ? <span className="text-muted-foreground">Group: {group.name}</span>
              : <span>Select a group</span>;

  return (
      <StepPanel
          title={summary}
          status={
            error
                ? 'error'
                : group
                    ? 'complete'
                    : 'default'
          }
          openByDefault={openByDefault}
      >
        <div className="space-y-3">
          {group && <div>
            <h2 className="text-sm font-medium mb-1">Selected group: {group.name}</h2>
            <p className="text-sm text-muted-foreground">ID: {group.id}</p>
            <p className="text-sm text-muted-foreground">Fields: {fields?.length ?? "..."}</p>
          </div>}

          <div>
            <label className="block text-sm font-medium mb-1">Search groups</label>
            <Input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setDisplayPage(1);
                }}
                placeholder="Archaeology Department"
            />
          </div>

          {isFetching && (
              <p className="text-sm text-muted-foreground">Loading groups…</p>
          )}
          {error && (
              <div className="text-sm text-red-600 space-y-2">
                <p>Error: {error.message}</p>
                <Button variant="outline" onClick={() => setReloadKey(reloadKey + 1)} className="cursor-pointer">Retry</Button>
              </div>
          )}

          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm items-center">
            {paginatedDisplay?.map(g => (
                <li
                    key={g.id}
                    className="flex"
                >
                  <Button
                      variant="ghost"
                      onClick={() => {
                        setGroup(g);
                        onSelect?.();
                      }}
                      className={clsx(
                          "w-full h-fit text-left flex flex-col items-start whitespace-normal break-words p-4 border rounded cursor-pointer",
                          {"bg-muted": group?.id === g.id}
                      )}
                  >
                    {g.name}
                    <span className="text-muted-foreground text-xs">ID: {g.id}</span>
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
