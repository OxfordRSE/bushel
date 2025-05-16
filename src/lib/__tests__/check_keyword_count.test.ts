import { describe, it, expect, vi, beforeEach } from 'vitest';
import { keywordCountCheck } from '@/lib/checks/row/check_keyword_count';
import { DataError } from '@/lib/DataRowParser';

describe('keywordCountCheck', () => {
  const emit = vi.fn();

  const makeParser = (keywords: unknown) => ({
    data: { keywords: keywords as string[] },
  });

  const makeContext = (min: number, max: number) => ({
    minKeywordCount: min,
    maxKeywordCount: max,
  });

  beforeEach(() => {
    emit.mockClear();
  });

  it('fails if keywords is not an array', async () => {
    const parser = makeParser('not-an-array');
    await keywordCountCheck.run(parser as never, emit, makeContext(1, 5));
    const failure = emit.mock.calls.find(([arg]) => arg.status === 'failed');
    expect(failure?.[0].error).toBeInstanceOf(DataError);
    expect(failure?.[0].error.message).toMatch(/must be an array/i);
  });

  it('fails if maxKeywordCount is missing', async () => {
    const parser = makeParser(['a', 'b']);
    await keywordCountCheck.run(parser as never, emit, { minKeywordCount: 1 } as never);
    const failure = emit.mock.calls.find(([arg]) => arg.status === 'failed');
    expect(failure?.[0].error.message).toMatch(/Missing minimum keyword count/);
  });

  it('fails if minKeywordCount is missing', async () => {
    const parser = makeParser(['a', 'b']);
    await keywordCountCheck.run(parser as never, emit, { maxKeywordCount: 5 } as never);
    const failure = emit.mock.calls.find(([arg]) => arg.status === 'failed');
    expect(failure?.[0].error.message).toMatch(/Missing maximum keyword count/);
  });

  it('fails if too many keywords', async () => {
    const parser = makeParser(['a', 'b', 'c']);
    await keywordCountCheck.run(parser as never, emit, makeContext(1, 2));
    const failure = emit.mock.calls.find(([arg]) => arg.status === 'failed');
    expect(failure?.[0].error.message).toMatch(/Too many keywords/);
  });

  it('fails if too few keywords', async () => {
    const parser = makeParser(['only']);
    await keywordCountCheck.run(parser as never, emit, makeContext(2, 5));
    const failure = emit.mock.calls.find(([arg]) => arg.status === 'failed');
    expect(failure?.[0].error.message).toMatch(/Not enough keywords/);
  });

  it('passes if keyword count is within bounds', async () => {
    const parser = makeParser(['one', 'two']);
    await keywordCountCheck.run(parser as never, emit, makeContext(2, 5));
    expect(emit).toHaveBeenCalledWith({
      status: 'success',
      details: 'Keyword count check completed',
    });
  });
});
