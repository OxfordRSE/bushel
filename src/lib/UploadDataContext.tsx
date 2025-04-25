'use client';

import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef,} from 'react';
import {useInputData} from './InputDataContext';
import {DataRowId, DataRowStatus} from './DataRowParser';
import {uploadFiles, UploadFileStatus} from "@/lib/figshare-upload-files";
import {
  AuthorDetails,
  FigshareArticleCreate,
  FigshareArticleCreateResponse, FundingCreate,
  RelatedMaterial
} from "@/lib/types/figshare-api";
import {Updater, useImmer} from "use-immer";
import {useGroup} from "@/lib/GroupContext";
import {useAuth} from "@/lib/AuthContext";

type UploadStatus = 'pending' | 'uploading' | 'created' | 'completed' | 'error' | 'skipped' | 'cancelled';

export interface UploadRowData {
  id: DataRowId;
  data: FigshareArticleCreate;
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

type UploadRowStateWithTitle = UploadRowState & { title?: string };

interface UploadDataContextType {
  rows: UploadRowStateWithTitle[];
  getRow: (id: DataRowId) => UploadRowStateWithTitle | undefined;
  skipRows: DataRowStatus["id"][]; // Rows to be skipped during upload
  setSkipRows: Updater<DataRowStatus["id"][]>;
  uploadRow: (id: DataRowId) => Promise<void>;
  uploadAll: () => Promise<void>;
  cancelRow: (id: DataRowId) => void;
  cancelAll: () => void;
  getSummaryCSV: () => string;
}

const UploadDataContext = createContext<UploadDataContextType | undefined>(undefined);

export function UploadDataProvider({ children }: { children: ReactNode }) {
  const [skipRows, setSkipRows] = useImmer<DataRowStatus["id"][]>([]);
  const [uploadState, setUploadState] = useImmer<Record<DataRowStatus["id"], UploadRowState>>({});
  const {group, fields} = useGroup();
  const {institutionLicenses, institutionCategories, fsFetch} = useAuth();
  const { rows: parsedRows, getParser, completed: inputDataParsingComplete, parserContext } = useInputData();

  // Extract figshare upload data once parsing is complete
  const uploadData: UploadRowData[] = useMemo(() => {
    if (!inputDataParsingComplete || !group || parsedRows.some(r => r.status !== 'valid')) return [];
    return parsedRows.map((r) => {
      const data = getParser(r.id).data;
      if (!data) throw new Error(`Row ${r.id} has no data`);
      const categories = (data?.categories as string[])
          .map(c => institutionCategories!.find(x => x.title === c)?.source_id)
          .filter(c => c !== undefined);
      if (categories.some(c => c === undefined)) {
        throw new Error(`Row ${r.id} has invalid categories: ${(data.categories as string[]).filter(c => !institutionCategories!.some(x => x.title === c)).join(',')}`);
      }
      const license = institutionLicenses!.find(x => x.name === data?.license)?.value;
      if (license === undefined) {
        throw new Error(`Row ${r.id} has invalid license: ${data?.license}`);
      }
      const customFields = fields!.map(f => ({name: f.name, value: String(data[f.name])}))
          .filter(x => x.value !== undefined && x.value !== null);

      return {
        id: r.id,
        data: {
          title: data!.title as string,
          description: data!.description as string,
          keywords: data!.keywords as string[],
          references: data!.references as string[],
          related_materials: data!.related_materials as RelatedMaterial[],
          categories_by_source_id: categories,
          authors: data!.authors as AuthorDetails[],
          custom_fields_list: customFields,
          defined_type: data!.item_type as string,
          funding_list: data!.funding as FundingCreate[],
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
            status: (skipRows.includes(r.id) ? 'skipped' : 'pending') as UploadStatus,
            fileProgress: undefined,
          }
        ])))
    );
  }, [inputDataParsingComplete, parsedRows, setUploadState, skipRows]);

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
    if (!upload_row || skipRows.includes(id)) return Promise.resolve();
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

        const result = await fsFetch<FigshareArticleCreateResponse>(
            'https://api.figshare.com/v2/account/articles',
            {
              method: 'POST',
              body: JSON.stringify(upload_row.data),
            }
        );

        if (cancelled) return cancel();

        setUploadState(prev => ({
          ...prev,
          [id]: { ...prev[id], status: 'created', result }
        }));

        if (upload_row.files.length) {
          await uploadFiles({
            files: upload_row.files,
            articleId: result.entity_id,
            rootDir: parserContext.rootDir!,
            fsFetch,
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
  }, [fsFetch, parserContext.rootDir, setUploadState, skipRows, uploadData]);

  const uploadAll = useCallback(async () => {
    const ids = Object.keys(uploadData) as DataRowId[];
    await Promise.all(ids.map(uploadRow));
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
    skipRows,
    setSkipRows,
    uploadRow,
    uploadAll,
    cancelRow,
    cancelAll,
    getSummaryCSV,
  };

  return <UploadDataContext.Provider value={ctx}>{children}</UploadDataContext.Provider>;
}

export function useUploadData() {
  const ctx = useContext(UploadDataContext);
  if (!ctx) throw new Error('useUploadData must be used within UploadDataProvider');
  return ctx;
}
