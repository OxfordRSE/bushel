import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { DataRowParser, DataError, type DataRowCheck, type DataRowStatus } from '@/lib/DataRowParser';

// Dummy stub for fields
const titleField = {
  name: 'title',
  field_type: 'text',
  is_mandatory: true,
  internal_settings: {},
} as const;

const optionalArrayField = {
  name: 'tags',
  field_type: 'text',
  is_mandatory: false,
  internal_settings: { is_array: true },
} as const;

const jsonField = {
  name: 'authors',
  field_type: 'JSON',
  is_mandatory: true,
  internal_settings: {
    schema: z.object({ name: z.string() }),
    is_array: true,
  },
} as const;

const createUpdateMock = () => {
  const updates: Partial<DataRowStatus>[] = [];
  const mock = vi.fn((_id, patch) => {
    updates.push(patch);
    return false;
  });
  return { mock, updates };
};

const contextStub = {
  knownCategories: ['archaeology'],
  knownKeywords: ['bones'],
  selectValues: {},
  fileMap: {},
  minCategoryCount: 0,
  minKeywordCount: 0,
  maxKeywordCount: 10000,
};

const columnMapping: [string, string][] = [
  ['', ''],
  ['Excel Title', 'title'],
  ['Excel Tags', 'tags'],
  ['Excel Authors', 'authors'],
];

describe('DataRowParser', () => {
  it('parses valid flat and array fields', async () => {
    const { mock, updates } = createUpdateMock();
    const parser = new DataRowParser(
      [undefined, 'The Title', 'tag1; tag2', JSON.stringify([{ name: 'Alice' }])],
      columnMapping,
      'upload1-1',
      mock,
      [titleField, optionalArrayField, jsonField],
      contextStub,
    );
    await parser['expand_row_data']();

    expect(parser.data).toMatchObject({
      title: 'The Title',
      tags: ['tag1', 'tag2'],
      authors: [{ name: 'Alice' }],
    });
    expect(updates.some(u => u.title === 'The Title')).toBe(true);
  });

  it('throws on missing required field', async () => {
    const { mock } = createUpdateMock();
    const parser = new DataRowParser(
      [undefined, '', '', JSON.stringify([{ name: 'Alice' }])],
      columnMapping,
      'upload1-2',
      mock,
      [titleField, optionalArrayField, jsonField],
      contextStub,
    );
    await expect(() => parser['expand_row_data']()).rejects.toThrow(DataError);
  });

  it('throws on invalid JSON', async () => {
    const { mock } = createUpdateMock();
    const parser = new DataRowParser(
      [undefined, 'Title', 'tag1', '{ invalid json }'],
      columnMapping,
      'upload1-3',
      mock,
      [titleField, optionalArrayField, jsonField],
      contextStub,
    );
    await expect(() => parser['expand_row_data']()).rejects.toThrow('Cannot parse JSON');
  });

  it('throws on schema validation failure', async () => {
    const { mock } = createUpdateMock();
    const parser = new DataRowParser(
      [undefined, 'Title', 'tag1', JSON.stringify([{ notName: 'Oops' }])],
      columnMapping,
      'upload1-4',
      mock,
      [titleField, optionalArrayField, jsonField],
      contextStub,
    );
    await expect(() => parser['expand_row_data']()).rejects.toThrow('Invalid JSON');
  });

  it('warns on unrecognized keys', async () => {
    const { mock } = createUpdateMock();
    const parser = new DataRowParser(
      [undefined, 'Title', 'tag1', JSON.stringify([{ name: 'Alice', extra: 'unused' }])],
      columnMapping,
      'upload1-5',
      mock,
      [titleField, optionalArrayField, jsonField],
      contextStub,
    );
    await parser['expand_row_data']();
    expect(parser.checks['Read data'].some(r => r.warning?.includes('Unrecognized'))).toBe(true);
  });

  it('runs a mock check and records result', async () => {
    const { mock } = createUpdateMock();
    const parser = new DataRowParser([], [], 'upload1-6', mock, [], contextStub);
    const check: DataRowCheck<typeof contextStub> = {
      name: 'Mock Check',
      run: async (parser, emit) => {
        emit({ status: 'success', details: 'OK' });
      },
    };
    parser.checks['Mock Check'] = [];
    await parser.runCheck(check);
    expect(parser.checks['Mock Check']).toEqual([
      { status: 'pending' },
      { status: 'success', details: 'OK' },
    ]);
  });

  it('marks checks skipped if read fails', async () => {
    const { mock } = createUpdateMock();
    const parser = new DataRowParser(
      [undefined, '', '', ''],
      columnMapping,
      'upload1-7',
      mock,
      [titleField, optionalArrayField, jsonField],
      contextStub,
    );
    await parser.runAllChecks();
    expect(parser.checks['Check Files'].at(-1)?.status).toBe('skipped');
    expect(parser.checks['Check Files'].at(-1)?.warning).toMatch(/Skipping/);
  });

  it('complete only returns true after all checks', () => {
    const { mock } = createUpdateMock();
    const parser = new DataRowParser([], [], 'upload1-8', mock, [], contextStub);
    parser.checks = {
      a: [{ status: 'success' }],
      b: [{ status: 'pending' }],
    };
    expect(parser.complete).toBe(false);
    parser.checks.b[0].status = 'success';
    expect(parser.complete).toBe(true);
  });
});