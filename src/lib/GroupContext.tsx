'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { FigshareGroup, FigshareCustomField, FigshareArticle } from '@/lib/types/figshare-api';
import { fetchAllPagesWithConditionalCache } from '@/lib/fetchWithConditionalCache';
import {useAuth} from "@/lib/AuthContext";

interface GroupContextType {
  group: FigshareGroup | null;
  fields: FigshareCustomField[];
  articles: FigshareArticle[];
  setGroup: (
    group: FigshareGroup,
    opts?: {
      onFieldPage?: (page: FigshareCustomField[]) => void;
      onArticlePage?: (page: FigshareArticle[]) => void;
    }
  ) => void;
  clearGroup: () => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const {token} = useAuth();
  const [group, setGroupState] = useState<FigshareGroup | null>(null);
  const [fields, setFields] = useState<FigshareCustomField[]>([]);
  const [articles, setArticles] = useState<FigshareArticle[]>([]);

  const setGroup = async (
    g: FigshareGroup,
    opts?: {
      onFieldPage?: (page: FigshareCustomField[]) => void;
      onArticlePage?: (page: FigshareArticle[]) => void;
    }
  ) => {
    setGroupState(g);
    setFields([]);
    setArticles([]);
    if (!token) return;

    await Promise.all([
      fetchAllPagesWithConditionalCache<FigshareCustomField>({
        baseUrl: `account/institution/custom_fields?group_id=${g.id}`,
        token,
        pageSize: 100,
        onPage: (page) => {
          setFields((prev) => [...prev, ...page]);
          opts?.onFieldPage?.(page);
        },
      }),
      fetchAllPagesWithConditionalCache<FigshareArticle>({
        baseUrl: "account/articles/search",
        method: "POST",
        body: JSON.stringify({
          group_id: g.id,
        }),
        token,
        pageSize: 100,
        onPage: (page) => {
          setArticles((prev) => [...prev, ...page]);
          opts?.onArticlePage?.(page);
        },
      }),
    ]);
  };

  const clearGroup = () => {
    setGroupState(null);
    setFields([]);
    setArticles([]);
  };

  return (
    <GroupContext.Provider value={{ group, fields, articles, setGroup, clearGroup }}>
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