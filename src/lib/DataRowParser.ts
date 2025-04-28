import { fileRefCheck, FileRefCheckContext } from "@/lib/checks/check_files";
import { dateFormatCheck } from "@/lib/checks/check_dates";
import { Field } from "@/lib/InputDataContext";
import {
  categoryCountCheck,
  CategoryCountCheckContext,
} from "@/lib/checks/check_category_count";
import {
  keywordCountCheck,
  KeywordCountCheckContext,
} from "@/lib/checks/check_keyword_count";
import { selectValuesCheck } from "@/lib/checks/check_select_values";
import {
  AuthorDetails,
  FundingCreate,
  RelatedMaterial,
} from "@/lib/types/figshare-api";

export type CheckStatus =
  | "pending"
  | "in_progress"
  | "success"
  | "skipped"
  | "failed";

export interface CheckResult {
  status: CheckStatus;
  details?: string;
  error?: DataError;
  warning?: string;
}

export type DataRowId = `upload${number}-${number}`;

// The column name mapping is a list of tuples, where the first element is the
// column name in the Excel file and the second element is the regularized name
export type ColumnNameMapping = [ExcelFieldName, FigshareFieldName][];
type FigshareFieldName = string;
type ExcelFieldName = string;

export interface DataRowStatus {
  id: DataRowId;
  title?: string;
  requiredStorage?: number;
  excelRowNumber: number;
  status: "parsing" | "valid" | "error";
  errors: DataError[];
  warnings: string[];
}

export class DataError extends Error {
  readonly kind: string;
  constructor(message: string, kind = "DataError", from?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.kind = kind;
    if (from instanceof Error) {
      this.stack = from.stack;
    }
    if (from) console.error(from);
  }
}

export type ParserContext = FileRefCheckContext &
  CategoryCountCheckContext &
  KeywordCountCheckContext;

/**
 * The update function is called by the parser to patch a DataRowStatus.
 * If it returns `true`, it signals that the parser should terminate.
 */
export type UpdateStatusCallback = (
  id: DataRowId,
  patch: Partial<DataRowStatus>,
) => boolean | void;

type DataRowCheckContext = Record<string, unknown>;

/**
 * A DataRowCheck performs validation on a DataRowParser and calls `emit`
 * to report one or more CheckResults. If `emit` returns `true`, the check
 * function should terminate early.
 */
export interface DataRowCheck<T extends DataRowCheckContext = never> {
  name: string;
  run(
    parser: DataRowParser,
    emit: (result: CheckResult) => boolean | void,
    context: T,
  ): Promise<void>;
}

type AllowedCellJSON = FundingCreate | RelatedMaterial | AuthorDetails;

type ParsedCellContentType = string | string[] | AllowedCellJSON[] | Date;

type ExcelCell =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | { text?: string; hyperlink?: string };

function normalizeExcelCell(value: ExcelCell): string | number | null | Date {
  if (value == null) return null;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    value instanceof Date
  ) {
    return value;
  }

  if (typeof value === "object") {
    // ExcelJS rich text or hyperlink objects
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
    if ("hyperlink" in value && typeof value.hyperlink === "string") {
      return value.hyperlink.trim();
    }
  }

  return null;
}

/* DataRowParser is a class that parses a row of data from an Excel file
 * and runs a series of checks on it. It is used to validate the data
 * before uploading it to Figshare.
 *
 * The class can be given the full row of data from the Excel file.
 * Any columns that are in `columnNameMapping` but not in `fields` will be dropped during ingestion.
 * */
export class DataRowParser {
  public data: Record<string, ParsedCellContentType> | null = null;
  private terminated = false;
  public checks: Record<string, CheckResult[]> = {
    "Read data": [{ status: "pending" }],
    [fileRefCheck.name]: [{ status: "pending" }],
    [dateFormatCheck.name]: [{ status: "pending" }],
    [categoryCountCheck.name]: [{ status: "pending" }],
    [keywordCountCheck.name]: [{ status: "pending" }],
    [selectValuesCheck.name]: [{ status: "pending" }],
  };
  private _internalContext: DataRowCheckContext = {};

  constructor(
    public readonly input_data: unknown[],
    public readonly columnNameMapping: ColumnNameMapping,
    public readonly id: DataRowId,
    private readonly update: UpdateStatusCallback,
    public readonly fields: Field[],
    public readonly context: ParserContext,
  ) {}

  terminate() {
    this.terminated = true;
  }

  get internalContext() {
    return this._internalContext;
  }
  setInternalContextEntry(key: string, value: unknown) {
    this.internalContext[key] = value;
  }

  private maybeUpdate(patch: Partial<DataRowStatus>) {
    if (this.terminated) return true;
    const shouldTerminate = this.update(this.id, patch);
    if (shouldTerminate) {
      this.terminated = true;
    }
    return shouldTerminate;
  }

  private emitToUI = (result: CheckResult) => {
    // Only errors and warnings will get emitted in this way
    if (result.warning) {
      this.maybeUpdate({
        warnings: [
          ...Object.entries(this.checks).map(([check, results]) =>
            results.reduce(
              (acc, r) =>
                r.warning ? [...acc, `[${check}] ${r.warning}`] : acc,
              [] as string[],
            ),
          ),
        ].flat(),
      });
    } else {
      this.maybeUpdate({
        status: "error",
        errors: [
          ...Object.values(this.checks).map((results) =>
            results.reduce(
              (acc, r) => (r.error ? [...acc, r.error] : acc),
              [] as DataError[],
            ),
          ),
        ].flat(),
      });
    }
  };

  private report =
    (label: string) =>
    (result: CheckResult): boolean | void => {
      if (this.terminated) return true;
      this.checks[label].push(result);
      if (result.warning || result.error) {
        return this.emitToUI(result); // result updates are not propagated directly to UI
      }
    };

  // Expand the sparse array of input data into a full object by comparing vs headers
  private async expand_row_data() {
    if (this.input_data.length > this.columnNameMapping.length) {
      throw new DataError(
        "More cell values than headers (row too long)",
        "InvalidInputData",
      );
    }
    let title = "";
    this.data = Object.fromEntries(
      this.columnNameMapping
        .map((mapping) => mapping[1])
        .slice(1) // Skip the first header, which is empty because ExcelJS uses 1-indexed column numbers
        .map((header, i) => {
          // Side effect to detect the title
          if (header === "title") {
            title = this.input_data[i + 1] as string;
          }
          const field = this.fields.find((f) => f.name === header);
          if (!field) return null;
          if (this.input_data[i + 1] === undefined) {
            return [header, null];
          }
          const input = String(
            normalizeExcelCell(this.input_data[i + 1] as ExcelCell),
          ).trim(); // ExcelJS uses 1-indexed column numbers
          let value: ParsedCellContentType = input;
          if (field.field_type === "JSON") {
            let v: unknown;
            try {
              v = JSON.parse(value);
            } catch (e) {
              throw new DataError(
                `Cannot parse JSON for ${header}: ${value} [${e}]`,
                "InvalidInputData",
                e,
              );
            }
            if (!field.internal_settings.schema) {
              throw new DataError(
                `Field ${header} is JSON but no schema is defined`,
                "InvalidInputData",
              );
            }
            if (field.internal_settings.is_array && !Array.isArray(v)) v = [v];
            try {
              value = field.internal_settings.schema.parse(v);
            } catch (e) {
              throw new DataError(
                `Invalid JSON for ${header}: ${(e as Error).message}`,
                "InvalidInputData",
                e,
              );
            }
          } else if (field.internal_settings.is_array) {
            value = input
              .split(/;\s*/)
              .map((v) => v.trim())
              .filter((v) => v.length > 0);
          }
          return [header, value];
        })
        .filter((entry) => entry !== null) as [string, ParsedCellContentType][],
    );
    if (!title) {
      throw new DataError("No title found in row", "MissingTitle");
    }
    this.update(this.id, { title });
    this.report("Read data")({
      status: "success",
      details: "Row data expanded",
    });
  }

  async runCheck(check: DataRowCheck<ParserContext>): Promise<void> {
    if (this.terminated) return;
    if (
      this.report(check.name)({
        status: "pending",
      })
    )
      return;
    await check.run(this, this.report(check.name), this.context);
  }

  async runAllChecks(): Promise<void> {
    const checks = [
      fileRefCheck,
      dateFormatCheck,
      categoryCountCheck,
      keywordCountCheck,
      selectValuesCheck,
    ];

    const debug = (...args: unknown[]) => {
      if (process.env.NODE_ENV === "development")
        console.debug(this.id, ...args, this.checks);
    };
    debug("Read data");
    try {
      await this.runCheck({
        name: "Read data",
        run: async (parser) => await parser.expand_row_data(),
      });
    } catch (e) {
      const error =
        e instanceof DataError
          ? e
          : new DataError(
              e instanceof Error
                ? `Failed to read row data: ${e.message}`
                : String(e),
              "InvalidInputData",
            );
      this.report("Read data")({
        status: "failed",
        error,
      });
      for (const check of checks) {
        this.report(check.name)({
          status: "skipped",
          warning: "Skipping check due to error in row data",
        });
      }
      return;
    }

    for (const check of checks) {
      debug(check.name);
      try {
        await this.runCheck(check);
      } catch (e) {
        const error =
          e instanceof DataError
            ? e
            : new DataError(
                e instanceof Error
                  ? `Failed to run check: ${e.message}`
                  : String(e),
                "CheckError",
              );
        this.report(check.name)({
          status: "failed",
          error,
        });
      }
    }

    const hasErrors = Object.values(this.checks).some((results) =>
      results.some((c) => c.status === "failed"),
    );
    this.maybeUpdate({ status: hasErrors ? "error" : "valid" });
  }

  public get complete() {
    return Object.values(this.checks).every((results) =>
      results.some((c) => c.status !== "pending" && c.status !== "in_progress"),
    );
  }
}
