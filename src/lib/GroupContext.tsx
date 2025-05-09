'use client';

import {createContext, useContext, useState, ReactNode, useEffect, useMemo} from 'react';
import type {FigshareGroup, FigshareCustomField, FigshareArticle, FigshareItemType} from '@/lib/types/figshare-api';
import {useAuth} from "@/lib/AuthContext";
import {useInfiniteQuery, useQuery} from "@tanstack/react-query";

interface GroupContextType {
  group: FigshareGroup | null;
  fields: FigshareCustomField[] | null;
  articles: FigshareArticle[] | null;
  groupItemTypes: FigshareItemType[] | null;
  setGroup: (group: FigshareGroup|null) => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const {token, fetch, targetUser } = useAuth();
  const [group, setGroup] = useState<FigshareGroup | null>(null);

  useEffect(() => setGroup(null), [token, targetUser?.id]);

  const fields = useQuery<FigshareCustomField[]>({
    queryKey: ['fields', group?.id, token],
    queryFn: async () => {
      return await fetch<FigshareCustomField[]>(`https://api.figshare.com/v2/account/institution/custom_fields?group_id=${group?.id}`);
    },
    enabled: !!group,
  });

  const limit = 1000;
  const user_articles = useInfiniteQuery<FigshareArticle[]>({
    queryKey: ['my_articles', group?.id, token],
    queryFn: async ({pageParam}) => {
      return await fetch<FigshareArticle[]>(`https://api.figshare.com/v2/account/articles?page=${pageParam ?? 1}&page_size=${limit}`)
          .then(res => res.filter(article => article.group_id === group?.id));
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < limit) return undefined;
      return pages.length + 1;
    },
    enabled: !!group,
  });

  const public_articles = useInfiniteQuery<FigshareArticle[]>({
    queryKey: ['group_articles', group?.id, token],
    queryFn: async ({pageParam}) => {
      return await fetch<FigshareArticle[]>(`https://api.figshare.com/v2/articles?page=${pageParam ?? 1}&page_size=${limit}&group=${group?.id}&institution=${targetUser?.institution_id}`);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < limit) return undefined;
      return pages.length + 1;
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

  const combinedArticles = useMemo(() => {
    const userArticles = user_articles.data?.pages.flat() || [];
    const publicArticles = public_articles.data?.pages.flat() || [];

    return [...new Set([...userArticles, ...publicArticles])];
  }, [user_articles.data, public_articles.data]);

  return (
      <GroupContext.Provider value={{
        group,
        fields: fields.data ?? null,
        articles: combinedArticles.length > 0? combinedArticles : null,
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