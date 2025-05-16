import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryCountCheck } from '@/lib/checks/row/check_category_count';
import { DataError } from '@/lib/DataRowParser';

describe('categoryCountCheck', () => {
  const emit = vi.fn();

  const makeParser = (categories: unknown) => ({
    data: { categories: categories as string[] },
  });

  const makeContext = (min: number) => ({
    minCategoryCount: min,
  });

  beforeEach(() => {
    emit.mockClear();
  });

  it('emits in_progress and continues', async () => {
    const parser = makeParser(['archaeology']);
    await categoryCountCheck.run(parser as never, emit, makeContext(1));
    const inProgress = emit.mock.calls.find(([arg]) => arg.status === 'in_progress');
    expect(inProgress?.[0].details).toMatch(/started/);
  });

  it('fails if categories is not an array', async () => {
    const parser = makeParser('not-an-array');
    await categoryCountCheck.run(parser as never, emit, makeContext(1));
    const failure = emit.mock.calls.find(([arg]) => arg.status === 'failed');
    expect(failure?.[0].error).toBeInstanceOf(DataError);
    expect(failure?.[0].error.message).toMatch(/must be an array/i);
  });

  it('fails if minCategoryCount is missing', async () => {
    const parser = makeParser(['cat1']);
    await categoryCountCheck.run(parser as never, emit, {} as never);
    const failure = emit.mock.calls.find(([arg]) => arg.status === 'failed');
    expect(failure?.[0].error.message).toMatch(/Missing minimum category count/);
  });

  it('fails if not enough categories', async () => {
    const parser = makeParser([]);
    await categoryCountCheck.run(parser as never, emit, makeContext(1));
    const failure = emit.mock.calls.find(([arg]) => arg.status === 'failed');
    expect(failure?.[0].error.message).toMatch(/Not enough categories/);
  });

  it('passes if category count is valid', async () => {
    const parser = makeParser(['cat1', 'cat2']);
    await categoryCountCheck.run(parser as never, emit, makeContext(1));
    expect(emit).toHaveBeenCalledWith({
      status: 'success',
      details: 'Category count check completed',
    });
  });
});
