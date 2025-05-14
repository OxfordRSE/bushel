'use client';

import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState,} from 'react';
import {useInputData} from './InputDataContext';
import {DataRowId, DataRowStatus} from './DataRowParser';
import {uploadFiles, UploadFileStatus} from "@/lib/figshare-upload-files";
import {
  AuthorDetails,
  FigshareArticleCreate,
  FigshareArticleCreateResponse, FundingCreate,
  RelatedMaterial
} from "@/lib/types/figshare-api";
import {useImmer} from "use-immer";
import {useGroup} from "@/lib/GroupContext";
import {useAuth} from "@/lib/AuthContext";
import {cleanString, fuzzyCoerce, stringToFuzzyRegex} from "@/lib/utils";

type UploadStatus = 'pending' | 'uploading' | 'created' | 'completed' | 'error' | 'skipped' | 'cancelled';

export interface UploadRowData {
  id: DataRowId;
  data?: FigshareArticleCreate;
  files: string[];
}

export interface UploadRowState {
  id: DataRowId;
  excelRowNumber: number;
  status: UploadStatus;
  error?: Error;
  fileProgress?: UploadFileStatus;
  result?: FigshareArticleCreateResponse;
  startedAt?: number;
  completedAt?: number;
}

type UploadRowStateWithTitle = UploadRowState & {
  title?: string;
};

type FuzzyMatch = (Pick<UploadRowStateWithTitle,"title"|"excelRowNumber"> & { articleTitle: string })

interface UploadDataContextType {
  rows: UploadRowStateWithTitle[];
  getRow: (id: DataRowId) => UploadRowStateWithTitle | undefined;
  uploadRow: (id: DataRowId) => Promise<void>;
  uploadAll: () => Promise<void>;
  cancelRow: (id: DataRowId) => void;
  cancelAll: () => void;
  getSummaryCSV: () => string;
  exactMatches: string[];
  fuzzyWarnings: FuzzyMatch[];
  duplicatesAcknowledged: boolean;
  setDuplicatesAcknowledged: (acknowledged: boolean) => void;
}

const UploadDataContext = createContext<UploadDataContextType | undefined>(undefined);

export function UploadDataProvider({ children }: { children: ReactNode }) {
  const [uploadState, setUploadState] = useImmer<Record<DataRowStatus["id"], UploadRowState>>({});
  const {group, fields, articles} = useGroup();
  const {institutionLicenses, institutionCategories, fetch} = useAuth();
  const { rows: parsedRows, getParser, completed: inputDataParsingComplete, parserContext } = useInputData();
  const articleTitles = useMemo(() => articles?.map(article => article.title) || [], [articles]);
  const [duplicatesAcknowledged, setDuplicatesAcknowledged] = useState(false);

  // Utilities for fuzzy matching titles
  const exactMatches = useMemo(() => {
    return parsedRows
        .filter(r => r.title && articleTitles.includes(r.title))
        .map(r => r.title)
        .filter(Boolean) as string[];
  }, [parsedRows, articleTitles]);

  const cleanArticleTitles = useMemo(() => {
    return articleTitles.map(cleanString);
  }, [articleTitles]);

  const articleTitleRegex = useMemo(() => {
    return cleanArticleTitles.map(stringToFuzzyRegex);
  }, [cleanArticleTitles]);

  const fuzzyWarnings = useMemo(() => {
    const mapped = parsedRows.map(r => {
      if (!r.title)
        return null;
      const fuzzy = fuzzyCoerce(r.title, articleTitles, true, articleTitleRegex);
      const matchIndex = cleanArticleTitles.findIndex(title => title === fuzzy);
      if (matchIndex === -1)
        return null;
      return {
        excelRowNumber: r.excelRowNumber,
        title: r.title,
        articleTitle: fuzzy,
      };
    })
    const filtered = mapped.filter(Boolean) as FuzzyMatch[];
    return filtered.filter(match => !exactMatches.includes(match.title ?? ""));
  }, [parsedRows, articleTitles, articleTitleRegex, cleanArticleTitles, exactMatches]);

  // Extract figshare upload data once parsing is complete
  const uploadData: UploadRowData[] = useMemo(() => {
    if (!inputDataParsingComplete || !group || parsedRows.some(r => r.status !== 'valid')) return [];
    return parsedRows.map((r) => {
      let data;
      try {
        data = getParser(r.id).data;
      } catch {
        data = null;
      }
      if (!data) return { id: r.id, files: [] };
      const categories = (data?.categories as string[])
          .map(c => institutionCategories.find(x => x.title === c)?.source_id)
          .filter(c => c !== undefined);
      if (categories.some(c => c === undefined)) {
        throw new Error(`Row ${r.id} has invalid categories: ${(data.categories as string[]).filter(c => !institutionCategories.some(x => x.title === c)).join(',')}`);
      }
      const license = institutionLicenses.find(x => x.name === data?.license)?.value;
      if (institutionLicenses.length > 0 && license === undefined) {
        throw new Error(`Row ${r.id} has invalid license: ${data?.license}`);
      }
      const customFields = fields?.map(f => ({name: f.name, value: String(data[f.name])}))
          .filter(x => x.value !== undefined && x.value !== null);

      return {
        id: r.id,
        // data!. used for mandatory fields which are guaranteed to be present by DataRowParser
        data: {
          title: data!.title as string,
          description: data!.description as string,
          keywords: data!.keywords as string[],
          references: data!.references as string[] ?? [],
          related_materials: data!.related_materials as RelatedMaterial[] ?? [],
          categories_by_source_id: categories,
          authors: data!.authors as AuthorDetails[] ?? [],
          custom_fields_list: customFields,
          defined_type: data!.item_type as string,
          funding_list: data!.funding as FundingCreate[] ?? [],
          license,
          group_id: group.id,
        },
        files: data!.files as string[],
      }
    });
  }, [inputDataParsingComplete, group, parsedRows, getParser, institutionLicenses, fields, institutionCategories]);

  // Init upload state
  useEffect(() => {
    if (!inputDataParsingComplete) setUploadState({});
    setUploadState(
        Object.fromEntries(parsedRows.map((r) => ([
          r.id,
          {
            id: r.id,
            excelRowNumber: r.excelRowNumber,
            status: (exactMatches.includes(r.title ?? "") ? 'skipped' : 'pending') as UploadStatus,
            fileProgress: undefined,
          }
        ])))
    );
  }, [exactMatches, inputDataParsingComplete, parsedRows, setUploadState]);

  const add_title = useCallback((row: UploadRowState) => {
    const parsedRow = parsedRows.find(r => r.id === row.id);
    if (!parsedRow) return row;
    return {
      ...row,
      title: parsedRow.title,
    };
  }, [parsedRows]);

  const getRow = useCallback(
      (id: DataRowId) => add_title(uploadState[id]),
      [add_title, uploadState]
  );

  const uploadControllers = useRef(new Map<DataRowId, () => void>());

  const uploadRow = useCallback((id: DataRowId) => {
    const upload_row = uploadData.find(r => r.id === id);
    if (!upload_row || exactMatches.includes(upload_row.data?.title ?? "")) return Promise.resolve();
    let cancelled = false;

    const cancel = () => {
      cancelled = true;
      setUploadState(prev => ({
        ...prev,
        [id]: {...prev[id], status: 'cancelled'}
      }));
    };
    uploadControllers.current.set(id, cancel);

    setUploadState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        status: 'uploading',
        error: undefined,
        result: undefined,
        startedAt: Date.now(),
      }
    }));

    return (async () => {
      try {
        if (cancelled) return cancel();

        const result = await fetch<FigshareArticleCreateResponse>(
            'https://api.figshare.com/v2/account/articles',
            {
              method: 'POST',
              body: upload_row.data,
            }
        );

        if (cancelled) return cancel();

        setUploadState(prev => ({
          ...prev,
          [id]: { ...prev[id], status: 'created', result }
        }));

        if (upload_row.files?.length) {
          await uploadFiles({
            files: upload_row.files,
            articleId: result.entity_id,
            rootDir: parserContext.rootDir!,
            patchedFetch: fetch,
            onProgress: (status) => {
              setUploadState(prev => ({
                ...prev,
                [id]: { ...prev[id], fileProgress: status }
              }));
              return cancelled;
            }
          });
        }

        if (cancelled) return cancel();

        setUploadState(prev => ({
          ...prev,
          [id]: { ...prev[id], status: 'completed', completedAt: Date.now() }
        }));
      } catch (err: unknown) {
        console.error(err);
        setUploadState(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            status: 'error',
            error: err instanceof Error ? err : new Error('Unknown error')
          }
        }));
      }
      uploadControllers.current.delete(id);
    })();
  }, [exactMatches, fetch, parserContext.rootDir, setUploadState, uploadData]);

  const uploadAll = useCallback(async () => {
    await Promise.all(uploadData.map(r => r.id).map(uploadRow));
  }, [uploadData, uploadRow]);

  const cancelRow = useCallback((id: DataRowId) => {
    const cancel = uploadControllers.current.get(id);
    if (cancel) {
      cancel();
      uploadControllers.current.delete(id);
    }
  }, []);

  const cancelAll = useCallback(() => {
    uploadControllers.current.forEach(cancel => cancel());
  }, []);

  const getSummaryCSV = useCallback(() => {
    const headers = ['RowID', 'Status', 'Error', 'Warnings', "Started", "Completed", "DurationSec"];
    const rows = Object.values(uploadState).map(row => {
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
    return [headers.join(','), ...rows].join('\n');
  }, [uploadState]);

  const ctx: UploadDataContextType = {
    rows: Object.values(uploadState).map(add_title),
    getRow,
    uploadRow,
    uploadAll,
    cancelRow,
    cancelAll,
    getSummaryCSV,
    exactMatches,
    fuzzyWarnings: fuzzyWarnings.map(w => ({
      ...w,
      title: parsedRows.find(r => r.excelRowNumber === w.excelRowNumber)?.title,
    })).filter(Boolean) as (Pick<UploadRowStateWithTitle,"title"|"excelRowNumber"> & { articleTitle: string })[],
    duplicatesAcknowledged,
    setDuplicatesAcknowledged,
  };

  return <UploadDataContext.Provider value={ctx}>{children}</UploadDataContext.Provider>;
}

export function useUploadData() {
  const ctx = useContext(UploadDataContext);
  if (!ctx) throw new Error('useUploadData must be used within UploadDataProvider');
  return ctx;
}
