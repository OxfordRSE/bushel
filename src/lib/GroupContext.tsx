'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type {FigshareGroup, FigshareCustomField, FigshareArticle, FigshareItemType} from '@/lib/types/figshare-api';
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
  const {token, fsFetch, fsFetchPaginated} = useAuth();
  const [group, setGroupState] = useState<FigshareGroup | null>(null);
  const [fields, setFields] = useState<FigshareCustomField[] | null>(null);
  const [articles, setArticles] = useState<FigshareArticle[] | null>(null);
  const [groupItemTypes, setGroupItemTypes] = useState<FigshareItemType[] | null>(null);
  const [errors, setErrors] = useState<FigshareAPIError[]>([]);

  const setGroup = async (
      g: FigshareGroup
  ) => {
    setGroupState(g);
    setFields(null);
    setArticles(null);
    setErrors([]);
    if (!token) return;

    await Promise.all([
      fsFetch<FigshareCustomField[]>(`https://api.figshare.com/v2/account/institution/custom_fields?group_id=${g.id}`, {
        headers: {Authorization: `token ${token}`}
      })
          .then(setFields)
          .catch(e => setErrors([...errors, e])),
      fsFetchPaginated<FigshareArticle>(
          "https://api.figshare.com/v2/account/articles",
          (page: FigshareArticle[]) => {
            if (page.length === 0) return;
            const filtered = page.filter(article => article.group_id === g.id);
            if (filtered.length > 0) {
              setArticles(prev => [...(prev || []), ...filtered]);
            }
          }
      )
          .catch(e => setErrors([...errors, e])),
      fsFetch<FigshareItemType[]>(`https://api.figshare.com/v2/item_types?group_id=${g.id}`, {
        headers: {Authorization: `token ${token}`}
      })
          .then(setGroupItemTypes)
          .catch(e => setErrors([...errors, e])),
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