import { describe, it, expect } from 'vitest';
import {DataError, DataRowParser} from '@/lib/DataRowParser';
import {CheckQuota} from "@/lib/checks/file/check_quota";

const makeParser = (quotaUsed?: number): DataRowParser => ({
  internalContext: {
    quotaUsed,
  },
} as unknown as DataRowParser);

describe('CheckQuota', () => {
  it('marks status valid when total quota is under limit', () => {
    const data = {
      '1': makeParser(500),
      '2': makeParser(400),
    };

    const check = new CheckQuota(data, 1000);

    expect(check.status).toBe('valid');
    expect(check.errors).toHaveLength(0);
  });

  it('marks status valid when total quota is exactly equal to limit', () => {
    const data = {
      '1': makeParser(500),
      '2': makeParser(500),
    };

    const check = new CheckQuota(data, 1000);

    expect(check.status).toBe('valid');
    expect(check.errors).toHaveLength(0);
  });

  it('marks status error when quota is exceeded', () => {
    const data = {
      '1': makeParser(800),
      '2': makeParser(400),
    };

    const check = new CheckQuota(data, 1000);

    expect(check.status).toBe('error');
    expect(check.errors).toHaveLength(1);
    const err = check.errors[0];
    expect(err).toBeInstanceOf(DataError);
    expect(err.kind).toBe('QuotaExceededError');
    expect(err.message).toMatch(/exceeds quota/);
    expect(err.message).toMatch(/1200b.*1000b.*200b/); // actual vs limit vs overage
  });

  it('treats missing quotaUsed values as 0', () => {
    const data = {
      '1': makeParser(),
      '2': makeParser(500),
    };

    const check = new CheckQuota(data, 500);

    expect(check.status).toBe('valid');
  });
});
