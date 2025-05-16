import { describe, it, expect, vi, beforeEach } from 'vitest';
import { selectValuesCheck } from '@/lib/checks/row/check_select_values';
import { DataError } from '@/lib/DataRowParser';

describe('selectValuesCheck', () => {
  const emit = vi.fn();

  const makeParser = (data: Record<string, unknown>, options: string[], isArray = false) => ({
    data,
    fields: [
      {
        name: 'discipline',
        field_type: 'dropdown',
        is_mandatory: true,
        internal_settings: { options, is_array: isArray },
      },
    ],
  });

  beforeEach(() => {
    emit.mockClear();
  });

  it('skips if parser.data is null', async () => {
    const parser = { data: null, fields: [] };
    await selectValuesCheck.run(parser as never, emit, {});
    expect(emit).toHaveBeenCalledWith({ status: 'skipped', details: 'No data to check' });
  });

  it('passes if values match options', async () => {
    const parser = makeParser({ discipline: 'Archaeology' }, ['Archaeology']);
    await selectValuesCheck.run(parser as never, emit, {});
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success' })
    );
  });

  it('coerces fuzzy match', async () => {
    const parser = makeParser({ discipline: 'archaeology' }, ['Archaeology']);
    await selectValuesCheck.run(parser as never, emit, {});
    expect(parser.data!.discipline).toBe('Archaeology');
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'in_progress', details: expect.stringMatching(/coerced/i) })
    );
  });

  it('fails on invalid value', async () => {
    const parser = makeParser({ discipline: 'Zoology' }, ['Archaeology']);
    await selectValuesCheck.run(parser as never, emit, {});
    const failure = emit.mock.calls.find(([arg]) => arg.status === 'failed');
    expect(failure?.[0].error).toBeInstanceOf(DataError);
    expect(failure?.[0].error.message).toMatch(/Zoology is not a valid option/);
  });

  it('works for array fields with fuzzy + invalid mix', async () => {
    const parser = makeParser({ discipline: ['archaeology', 'Zoology'] }, ['Archaeology'], true);
    await selectValuesCheck.run(parser as never, emit, {});

    // Fuzzy should coerce first element
    // @ts-expect-error don't care about type in tests
    expect(parser.data!.discipline[0]).toBe('Archaeology');

    // Second should trigger failure
    const failure = emit.mock.calls.find(([arg]) => arg.status === 'failed');
    expect(failure?.[0].error.message).toMatch(/Zoology is not a valid option/);
  });
});
