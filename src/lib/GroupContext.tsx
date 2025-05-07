'use client';

import {createContext, useContext, useState, ReactNode, useEffect} from 'react';
import type {FigshareGroup, FigshareCustomField, FigshareArticle, FigshareItemType} from '@/lib/types/figshare-api';
import {useAuth} from "@/lib/AuthContext";
import {useQuery} from "@tanstack/react-query";

interface GroupContextType {
  group: FigshareGroup | null;
  fields: FigshareCustomField[] | null;
  articles: FigshareArticle[] | null;
  groupItemTypes: FigshareItemType[] | null;
  setGroup: (group: FigshareGroup|null) => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const {token, fetch, impersonationTarget } = useAuth();
  const [group, setGroup] = useState<FigshareGroup | null>(null);

  useEffect(() => setGroup(null), [token, impersonationTarget?.id]);

  const fields = useQuery<FigshareCustomField[]>({
    queryKey: ['fields', group?.id, token],
    queryFn: async () => {
      return await fetch<FigshareCustomField[]>(`https://api.figshare.com/v2/account/institution/custom_fields?group_id=${group?.id}`);
    },
    enabled: !!group,
  });

  const user_articles = useQuery<FigshareArticle[]>({
    queryKey: ['my_articles', group?.id, token],
    queryFn: async () => {
      return await fetch<FigshareArticle[]>(`https://api.figshare.com/v2/account/articles`)
          .then(res => res.filter(article => article.group_id === group?.id));
    },
    enabled: !!group,
  });

  const public_articles = useQuery<FigshareArticle[]>({
    queryKey: ['private_articles', group?.id, token],
    queryFn: async () => {
      return await fetch<FigshareArticle[]>(`https://api.figshare.com/v2/articles?group_id=${group?.id}`);
    },
    enabled: !!group,
  });

  const item_types = useQuery<FigshareItemType[]>({
    queryKey: ['item_types', group?.id, token],
    queryFn: async () => {
      return await fetch<FigshareItemType[]>(`https://api.figshare.com/v2/item_types?group_id=${group?.id}`);
    },
    enabled: !!group,
  });

  return (
      <GroupContext.Provider value={{
        group,
        fields: fields.data ?? null,
        articles: user_articles.data || public_articles.data
            ? [...(user_articles.data ?? []), ...(public_articles.data ?? [])]
            : null,
        setGroup,
        groupItemTypes: item_types.data ?? null,
      }}>
        {children}
      </GroupContext.Provider>
  );
}

export function useGroup() {
  const ctx = useContext(GroupContext);
  if (!ctx) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return ctx;
}