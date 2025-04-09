'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type {FigshareGroup, FigshareCustomField, FigshareArticle, FigshareItemType} from '@/lib/types/figshare-api';
import { fetchAllPagesWithConditionalCache } from '@/lib/fetchWithConditionalCache';
import {useAuth} from "@/lib/AuthContext";
import {FigshareAPIError} from "@/lib/utils";

interface GroupContextType {
  group: FigshareGroup | null;
  fields: FigshareCustomField[] | null;
  articles: FigshareArticle[] | null;
  groupItemTypes: FigshareItemType[] | null;
  setGroup: (
      group: FigshareGroup,
      opts?: {
        onFieldPage?: (page: FigshareCustomField[]) => void;
        onArticlePage?: (page: FigshareArticle[]) => void;
      }
  ) => void;
  clearGroup: () => void;
  errors: FigshareAPIError[];
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const {token} = useAuth();
  const [group, setGroupState] = useState<FigshareGroup | null>(null);
  const [fields, setFields] = useState<FigshareCustomField[] | null>(null);
  const [articles, setArticles] = useState<FigshareArticle[] | null>(null);
  const [groupItemTypes, setGroupItemTypes] = useState<FigshareItemType[] | null>(null);
  const [errors, setErrors] = useState<FigshareAPIError[]>([]);

  const setGroup = async (
      g: FigshareGroup,
      opts?: {
        onFieldPage?: (page: FigshareCustomField[]) => void;
        onArticlePage?: (page: FigshareArticle[]) => void;
      }
  ) => {
    setGroupState(g);
    setFields(null);
    setArticles(null);
    setErrors([]);
    if (!token) return;

    await Promise.all([
      fetchAllPagesWithConditionalCache<FigshareCustomField>({
        baseUrl: `https://api.figshare.com/v2/account/institution/custom_fields?group_id=${g.id}`,
        token,
        pageSize: 100,
        onPage: (page) => {
          setFields((prev) => prev? [...prev, ...page] : page);
          opts?.onFieldPage?.(page);
        },
      }).catch(e => setErrors([...errors, e])),
      fetchAllPagesWithConditionalCache<FigshareArticle>({
        baseUrl: "https://api.figshare.com/v2/account/articles/search",
        method: "POST",
        body: JSON.stringify({
          group_id: g.id,
        }),
        token,
        pageSize: 100,
        onPage: (page) => {
          setArticles((prev) => prev? [...prev, ...page] : page);
          opts?.onArticlePage?.(page);
        },
      }).catch(e => setErrors([...errors, e])),
      fetchAllPagesWithConditionalCache<FigshareItemType>({
        baseUrl: `https://api.figshare.com/v2/item_types?group_id=${g.id}`,
        token,
        pageSize: 100,
        onPage: (page) => {
          setGroupItemTypes((prev) => prev? [...prev, ...page] : page);
        },
      }).catch(e => setErrors([...errors, e])),
    ]);
  };

  const clearGroup = () => {
    setGroupState(null);
    setFields(null);
    setArticles(null);
    setErrors([]);
  };

  return (
      <GroupContext.Provider value={{ group, fields, articles, setGroup, clearGroup, errors, groupItemTypes }}>
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