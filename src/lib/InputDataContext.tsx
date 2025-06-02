import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { type Updater, useImmer } from "use-immer";
import {
  ColumnNameMapping,
  DataError,
  DataRowId,
  DataRowParser,
  DataRowStatus,
  ParserContext,
} from "./DataRowParser";
import ExcelJS from "exceljs";
import { useGroup } from "@/lib/GroupContext";
import { useAuth } from "@/lib/AuthContext";
import {
  FigshareCategory,
  FigshareCustomField,
  FigshareItemType,
  FigshareLicense,
} from "@/lib/types/figshare-api";
import { toFigshareColumnName } from "@/lib/utils";
import {
  AuthorDetailsSchema,
  DescriptionSchema,
  FundingCreateSchema,
  RelatedMaterialSchema,
} from "@/lib/types/schemas";
import { type ZodTypeAny } from "zod";
import { CheckTitlesAreUnique } from "@/lib/checks/file/check_titles_are_unique";
import { CheckQuota } from "@/lib/checks/file/check_quota";

export type FileCheckStatusString = "checking" | "valid" | "error";

interface FileCheckStatus {
  name: string;
  status: FileCheckStatusString;
  errors: DataError[];
  warnings: string[];
}

export interface FileCheck extends FileCheckStatus {
  check: () => void;
}

interface InputDataContextValue {
  rows: DataRowStatus[];
  parserContext: ParserContext;
  setParserContext: Updater<ParserContext>;
  // Ready to receive a file
  ready: boolean;
  file: File | null;
  fileChecks: FileCheckStatus[];
  // Set the file to parse. If `clearCurrent` is true, it will reset the current file and rows.
  // If `clearCurrent` is false, it will throw an error if a file is already set.
  setFile: (file: File, clearCurrent: boolean) => void;
  // Start checks on the current file.
  check: () => Promise<void>;
  // Stop any in-progress checks
  halt: () => void;
  // Reset the context to its initial state
  reset: (clearParserContext: boolean) => void;
  loadErrors: string[];
  loadWarnings: string[];
  working: boolean;
  completed: boolean;
  rowChecksCompleted: boolean;
  getParser: (id: DataRowStatus["id"]) => DataRowParser;
  resetKey: number;
  maxErrorCount: number;
  setMaxErrorCount: Updater<number>;
  maxWarningCount: number;
  setMaxWarningCount: Updater<number>;
}

type combineFieldsArgs = {
  categories: FigshareCategory[];
  licenses: FigshareLicense[];
  itemTypes: FigshareItemType[];
  customFields: FigshareCustomField[];
};

export type Field = Pick<
  FigshareCustomField,
  "name" | "is_mandatory" | "settings"
> & {
  id?: number;
  field_type: FigshareCustomField["field_type"] | "file" | "JSON";
  internal_settings: {
    is_array?: boolean;
    options?: string[];
    // JSON fields can have a schema to enforce a specific structure
    schema?: ZodTypeAny;
  };
};

function combineFields({
  categories,
  licenses,
  itemTypes,
  customFields,
}: combineFieldsArgs): Field[] {
  const categoryTitles = categories.map((c) => c.title);
  const licenseNames = licenses.map((l) => l.name);
  const itemTypeNames = itemTypes.map((it) => it.name);

  // OVERWRITE customFields 'Files' field_type to 'file'
  const convertedCustomFields: Field[] = customFields.map((f) => ({
    ...f,
    internal_settings: {},
  }));
  const existingFilesField = convertedCustomFields.find((f) =>
    /^Files$/i.test(f.name),
  );
  if (existingFilesField) {
    existingFilesField.name = "files";
    existingFilesField.field_type = "file";
    existingFilesField.internal_settings = {
      ...existingFilesField.internal_settings,
      is_array: true,
    };
  } else {
    convertedCustomFields.push({
      name: "files",
      field_type: "file",
      internal_settings: { is_array: true },
      is_mandatory: false,
    });
  }

  return [
    // Fields loaded by FigShare API queries
    {
      name: "categories",
      field_type: "text",
      internal_settings: { options: categoryTitles, is_array: true },
      is_mandatory: true,
    },
    {
      name: "license",
      field_type: "text",
      internal_settings: { options: licenseNames },
      is_mandatory: true,
    },
    {
      name: "item_type",
      field_type: "text",
      internal_settings: { options: itemTypeNames },
      is_mandatory: true,
    },
    // Mandatory fields with set definitions
    {
      name: "title",
      field_type: "text",
      internal_settings: {},
      is_mandatory: true,
    },
    {
      name: "description",
      field_type: "text",
      internal_settings: { schema: DescriptionSchema },
      is_mandatory: true,
    },
    {
      name: "authors",
      field_type: "JSON",
      is_mandatory: true,
      internal_settings: { schema: AuthorDetailsSchema, is_array: true },
    },
    // Optional fields with set definitions
    {
      name: "keywords",
      field_type: "text",
      internal_settings: { is_array: true },
    },
    {
      name: "funding",
      field_type: "JSON",
      internal_settings: { is_array: true, schema: FundingCreateSchema },
    },
    {
      name: "references",
      field_type: "text",
      internal_settings: { is_array: true },
    },
    {
      name: "related_materials",
      field_type: "JSON",
      internal_settings: { is_array: true, schema: RelatedMaterialSchema },
    },
    ...convertedCustomFields,
  ];
}

type ExtractedRowData = {
  rows: ExcelJS.RowValues[];
  colNameMap: ColumnNameMapping;
  droppedColumns: string[];
};

async function extractRowsFromSheet({
  file,
  fieldList,
}: {
  file: File;
  fieldList: Field[];
}): Promise<ExtractedRowData> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const fieldNames = fieldList.map((f) => f.name);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("No sheets found in Excel file.");
  const colNameMap: ColumnNameMapping = [];

  const headers = worksheet.getRow(1).values;
  if (!headers) throw new Error("No headers found in Excel file.");
  if (!(headers instanceof Array))
    throw new Error("Invalid headers format in Excel file.");

  headers.map(String).forEach((header, i) => {
    colNameMap[i] = [header, toFigshareColumnName(header, fieldNames)]; // ExcelJS uses 1-indexed column numbers
  });

  // Check the headers match the expected fields
  const excelColumnNames = colNameMap.map((v) => v[1]);
  const mandatoryFields = fieldList
    .filter((f) => f.is_mandatory)
    .map((f) => f.name);
  const missingHeaders = mandatoryFields.filter(
    (h) => !excelColumnNames.includes(h),
  );
  if (missingHeaders.length > 0)
    throw new Error(`Missing mandatory columns: ${missingHeaders.join(", ")}`);

  const all_data = worksheet.getSheetValues();
  const lastRowIndex = all_data.findLastIndex((r) => r?.length);

  if (all_data.length < 3 || (lastRowIndex !== -1 && lastRowIndex < 2))
    throw new Error("No data found in Excel file.");

  return {
    rows: all_data.slice(2, lastRowIndex === -1 ? undefined : lastRowIndex + 1),
    colNameMap,
    droppedColumns: excelColumnNames.filter((h) => !fieldNames.includes(h)),
  };
}

const InputDataContext = createContext<InputDataContextValue | undefined>(
  undefined,
);

export function InputDataProvider({ children }: { children: React.ReactNode }) {
  const debug = process.env.NODE_ENV === "development";
  const [rows, setRows] = useImmer<DataRowStatus[]>([]);
  const parsersRef = useRef<DataRowParser[]>([]);
  const sessionRef = useRef<number>(0);
  const [fieldList, setFieldList] = useImmer<Field[]>([]);
  const [loadErrors, setLoadErrors] = useImmer<string[]>([]);
  const [loadWarnings, setLoadWarnings] = useImmer<string[]>([]);
  const [working, setWorking] = useImmer<boolean>(false);
  const [rowChecksCompleted, setRowChecksCompleted] = useImmer<boolean>(false);
  const [file, _setFile] = useImmer<File | null>(null);
  const [ready, setReady] = useImmer<boolean>(false);
  const { institutionCategories, institutionLicenses, targetUser } = useAuth();
  const { fields, groupItemTypes } = useGroup();
  const [maxErrorCount, setMaxErrorCount] = useImmer<number>(20);
  const [maxWarningCount, setMaxWarningCount] = useImmer<number>(20);
  const [parserContext, setParserContext] = useImmer<ParserContext>({
    rootDir: undefined,
    minCategoryCount: 1,
    minKeywordCount: 1,
    maxKeywordCount: 100,
  });
  const [fileChecks, setFileChecks] = useImmer<FileCheck[]>([]);
  const [resetKey, setResetKey] = useImmer<number>(0);
  const errorCount = useRef<number>(0);
  const warningCount = useRef<number>(0);

  const field_queries_loaded = useMemo(
    () =>
      !!(
        institutionCategories &&
        institutionLicenses &&
        fields &&
        groupItemTypes
      ),
    [institutionCategories, institutionLicenses, fields, groupItemTypes],
  );

  useEffect(() => {
    if (field_queries_loaded) {
      // The individual sets of fields must all be present or field_queries_loaded will be false. Not caught by ESLint because of the useMemo.
      setFieldList(
        combineFields({
          categories: institutionCategories!,
          licenses: institutionLicenses!,
          itemTypes: groupItemTypes!,
          customFields: fields!,
        }),
      );
      setReady(true);
    }
  }, [
    fields,
    institutionCategories,
    institutionLicenses,
    groupItemTypes,
    field_queries_loaded,
    setFieldList,
    setReady,
  ]);

  const halt = useCallback(() => {
    errorCount.current = 0;
    warningCount.current = 0;
    parsersRef.current.forEach((p) => p.terminate());
    parsersRef.current = [];
    sessionRef.current++;
    setWorking(false);
  }, [setWorking]);

  const reset = useCallback(
    (clearParserContext = false) => {
      halt();
      setReady(field_queries_loaded);
      setFileChecks([]);
      setRowChecksCompleted(false);
      if (clearParserContext)
        setParserContext({
          rootDir: undefined,
          minCategoryCount: 1,
          minKeywordCount: 1,
          maxKeywordCount: 100,
        });
      _setFile(null);
      setRows([]);
      setLoadErrors([]);
      setLoadWarnings([]);
    },
    [_setFile, field_queries_loaded, halt, setRowChecksCompleted, setLoadErrors, setLoadWarnings, setParserContext, setReady, setRows, setFileChecks],
  );

  useEffect(() => {
    reset();
    setResetKey((prev) => prev + 1);
  }, [reset, setResetKey, targetUser?.id]);

  const setFile = useCallback(
    async (file: File, clearCurrent = true) => {
      if (debug) console.debug("setFile", file);
      if (clearCurrent) reset();
      else if (file) throw new Error("File already set");
      return _setFile(file);
    },
    [_setFile, debug, reset],
  );

  const check = useCallback(async () => {
    if (!file) {
      setLoadErrors((errors) => [...errors, "No file selected"]);
      return;
    }
    if (!ready) {
      setLoadErrors((errors) => [...errors, "Field queries not yet loaded"]);
      return;
    }

    setWorking(true);
    let sheetData;
    try {
      sheetData = await extractRowsFromSheet({ file, fieldList });
      if (debug) console.debug("rowsFromSheet", sheetData);
    } catch (e) {
      reset();
      setLoadErrors((errors) => [
        ...errors,
        e instanceof Error ? e.message : e,
      ]);
      return;
    }

    const { rows: rowsFromSheet, colNameMap, droppedColumns } = sheetData;
    if (droppedColumns.length > 0) {
      setLoadWarnings((warnings) => [
        ...warnings,
        `Dropped unrecognised columns: ${droppedColumns.join(", ")}`,
      ]);
    }

    const sessionId = `upload${sessionRef.current}`;
    const newRows: DataRowStatus[] = [];
    const newParsers: DataRowParser[] = [];

    for (let i = 0; i < rowsFromSheet.length; i++) {
      if (debug) console.debug("row", i, rowsFromSheet[i]);
      const data = rowsFromSheet[i];
      if (
        !(data instanceof Array) ||
        data.length === 0 ||
        data.every((cell) => cell === null || cell === undefined || cell === "")
      )
        continue; // Skip empty rows

      const rowId: DataRowId = `${sessionId}-${i}` as DataRowId;
      const initial: DataRowStatus = {
        id: rowId,
        title: undefined,
        excelRowNumber: i + 2, // ExcelJS uses 1-indexed row numbers and has a header row
        status: "parsing",
        errors: [],
        warnings: [],
      };

      const update = (
        id: DataRowId,
        patch: Partial<DataRowStatus>,
      ): boolean | void => {
        if (debug) console.debug("update", id, patch);
        setRows((draft) => {
          const idx = draft.findIndex((r) => r.id === id);
          if (idx === -1) {
            // row not found - terminate
            return true;
          }
          Object.assign(draft[idx], patch);
        });
        // Check if that was the last row to finish
        const allFinished = parsersRef.current.every((p) => p.complete);
        if (allFinished) {
          setWorking(false);
          setRowChecksCompleted(true);
          return true;
        }
        // If we've passed the error or warning threshold, stop everything
        if (patch.status === "error") {
          errorCount.current++;
          if (errorCount.current >= maxErrorCount) {
            halt();
            return true;
          }
        }
        if (patch.warnings?.length) {
          warningCount.current++;
          if (warningCount.current >= maxWarningCount) {
            halt();
            return true;
          }
        }
        // allow continuation
      };

      const parser = new DataRowParser(
        data,
        colNameMap,
        rowId,
        update,
        fieldList,
        parserContext,
      );
      if (debug) console.debug("parser", parser);
      newRows.push(initial);
      newParsers.push(parser);
    }

    setRows(newRows);
    parsersRef.current = newParsers;
    newParsers.forEach((p) => p.runAllChecks());
    _setFile(null); // Clear the file after parsing
  }, [
    debug,
    fieldList,
    file,
    parserContext,
    ready,
    reset,
    setRowChecksCompleted,
    setLoadErrors,
    setLoadWarnings,
    setRows,
    setWorking,
    _setFile,
    maxErrorCount,
    maxWarningCount,
    halt,
  ]);

  const getParser = useCallback((id: DataRowStatus["id"]) => {
    const parser = parsersRef.current.find((p) => p.id === id);
    if (!parser) throw new Error(`No parser with id ${id}`);
    return parser;
  }, []);

  // Start file-level checks when all rows are parsed
  useEffect(() => {
    if (
      rowChecksCompleted &&
      fileChecks.length === 0 &&
      rows.length > 0 &&
      parsersRef.current.length > 0
    ) {
      const data = Object.fromEntries(
        rows.map((r) => {
          const parser = parsersRef.current.find((p) => p.id === r.id);
          if (!parser) throw new Error(`No parser with id ${r.id}`);
          return [r.excelRowNumber, parser];
        }),
      );

      setFileChecks([
        new CheckTitlesAreUnique(data),
        new CheckQuota(
          data,
          (targetUser?.quota ?? 0) - (targetUser?.used_quota ?? 0),
        ),
      ]);
    }
  }, [rowChecksCompleted, rows, targetUser?.quota, targetUser?.used_quota, setFileChecks]);

  return (
    <InputDataContext.Provider
      value={{
        rows,
        ready,
        file,
        setFile,
        fileChecks,
        halt,
        reset,
        loadErrors,
        loadWarnings,
        working,
        completed: fileChecks.every((s) =>
          ["valid", "error"].includes(s.status),
        ),
        rowChecksCompleted,
        parserContext,
        setParserContext,
        check,
        getParser,
        resetKey,
        maxErrorCount,
        setMaxErrorCount,
        maxWarningCount,
        setMaxWarningCount,
      }}
    >
      {children}
    </InputDataContext.Provider>
  );
}

export function useInputData() {
  const ctx = useContext(InputDataContext);
  if (!ctx)
    throw new Error("useInputData must be used inside an InputDataProvider");
  return ctx;
}
