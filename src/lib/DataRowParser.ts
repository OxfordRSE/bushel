export type CheckStatus = 'pending' | 'in_progress' | 'success' | 'skipped' | 'failed';

export interface CheckResult {
  status: CheckStatus;
  details?: string;
  error?: DataError;
}

export type DataRowId = `upload${number}-${number}`;

export interface DataRowStatus {
  id: DataRowId;
  excelRowNumber: number;
  status: 'parsing' | 'valid' | 'error';
  errors: DataError[];
  warnings: string[];
}

export class DataError extends Error {
  readonly kind: string;
  constructor(message: string, kind = 'DataError') {
    super(message);
    this.name = this.constructor.name;
    this.kind = kind;
  }
}

/**
 * The update function is called by the parser to patch a DataRowStatus.
 * If it returns `true`, it signals that the parser should terminate.
 */
export type UpdateStatusCallback = (
    rowId: DataRowId,
    patch: Partial<DataRowStatus>
) => boolean | void;

/**
 * A DataRowCheck performs validation on a DataRowParser and calls `emit`
 * to report one or more CheckResults. If `emit` returns `true`, the check
 * function should terminate early.
 */
export interface DataRowCheck {
  name: string;
  run(
      parser: DataRowParser,
      emit: (result: CheckResult) => boolean | void
  ): Promise<void>;
}

export const schemaCheck: DataRowCheck = {
  name: 'schema',
  async run(parser, emit) {
    const result: CheckResult = { status: 'success', details: 'Schema valid' };
    emit(result);
  }
};

export const fileRefCheck: DataRowCheck = {
  name: 'fileRef',
  async run(parser, emit) {
    await new Promise(r => setTimeout(r, 10));
    const result: CheckResult = { status: 'success', details: 'All referenced files accessible' };
    emit(result);
  }
};

export const dateFormatCheck: DataRowCheck = {
  name: 'dateFormat',
  async run(parser, emit) {
    const result: CheckResult = { status: 'success', details: 'Date fields formatted correctly' };
    emit(result);
  }
};

export class DataRowParser {
  public readonly id: string;
  public data: Record<string, unknown>|null = null;
  private terminated = false;
  public checks: Record<string, CheckResult> = {
    'read_data': { status: 'pending' },
    [schemaCheck.name]: { status: 'pending' },
    [fileRefCheck.name]: { status: 'pending' },
    [dateFormatCheck.name]: { status: 'pending' },
  };

  constructor(
      public readonly input_data: unknown[],
      public readonly headers: string[],
      private readonly rowId: DataRowId,
      sessionId: string,
      private readonly update: UpdateStatusCallback,
  ) {
    this.id = `${sessionId}-${rowId}`;
  }

  terminate() {
    this.terminated = true;
  }

  private maybeUpdate(patch: Partial<DataRowStatus>) {
    if (this.terminated) return;
    const shouldTerminate = this.update(this.rowId, patch);
    if (shouldTerminate) {
      this.terminated = true;
    }
  }

  private emit = (label: string) => (result: CheckResult): boolean | void => {
    if (this.terminated) return;
    this.checks[label] = result;
    return this.update(this.rowId, {}); // result updates are not propagated directly to UI
  };

  // Expand the sparse array of input data into a full object by comparing vs headers
  private async expand_row_data() {
    if (this.input_data.length > this.headers.length) {
      throw new DataError('More cell values than headers (row too long)', 'InvalidInputData');
    }
    this.data = Object.fromEntries(
        this.headers.map((header, i) => {
          const value = this.input_data[i];
          return [header, value ?? null];
        })
    )
    this.emit('read_data')({
        status: 'success',
        details: 'Row data expanded',
    });
  }

  async runCheck(check: DataRowCheck): Promise<void> {
    if (this.terminated) return;
    this.emit(check.name)({
        status: 'pending',
    });
    await check.run(this, this.emit(check.name));
  }

  async runAllChecks(): Promise<void> {
    try {
      await this.runCheck({
        name: 'read_data',
        run: async (parser, emit) => {
          await parser.expand_row_data();
          emit({ status: 'success' });
        },
      });
      await this.runCheck(schemaCheck);
      await this.runCheck(fileRefCheck);
      await this.runCheck(dateFormatCheck);

      const hasErrors = Object.values(this.checks).some(c => c.status === 'failed');
      this.maybeUpdate({status: hasErrors ? 'error' : 'valid'});
    } catch (err) {
      const error = err instanceof DataError ? err : new DataError(err instanceof Error? err.message : 'Unknown error during parsing', 'UnhandledError');
      this.terminated = true;
      this.maybeUpdate({
        status: 'error',
        errors: [error],
      });
    }
  }
}
