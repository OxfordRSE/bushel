'use client';

import {createContext, ReactNode, useCallback, useContext, useRef,} from 'react';
import {useUploadData} from "@/lib/UploadDataContext";

export type csv = string;

interface UploadReportsContextType {
  reports: csv[];
  createReport: () => void;
  clearReports: () => void;
}

const UploadReportsContext = createContext<UploadReportsContextType | undefined>(undefined);

export function UploadReportsProvider({ children }: { children: ReactNode }) {
  const reports = useRef<csv[]>([]);
  const { rows } = useUploadData();

  const createReport = useCallback(() => {
    const headers = ['RowID', 'Status', 'Error', 'Warnings', "Started", "Completed", "DurationSec"];
    const csv_rows = rows.map(row => {
      const warnings = row.result?.warnings?.map(w => JSON.stringify(w)).join('; ') ?? '';
      const error = JSON.stringify(row.error?.message) ?? '';
      return [
        row.id,
        row.status,
        error,
        warnings,
        row.startedAt? new Date(row.startedAt).toISOString() : '',
        row.completedAt? new Date(row.completedAt).toISOString() : '',
        row.completedAt && row.startedAt ? ((row.completedAt - row.startedAt) / 1000).toFixed(2) : '',
      ].join(',');
    });
    reports.current.push([headers.join(','), ...csv_rows].join('\n'));
  }, [rows]);

  const clearReports = () => {
    reports.current = [];
  }

  return <UploadReportsContext.Provider value={{reports: reports.current, createReport, clearReports}}>{children}</UploadReportsContext.Provider>;
}

export function useUploadReports() {
  const ctx = useContext(UploadReportsContext);
  if (!ctx) throw new Error('useUploadReports must be used within UploadReportsProvider');
  return ctx;
}
