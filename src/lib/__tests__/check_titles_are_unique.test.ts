import { describe, it, expect } from 'vitest';
import {DataError, DataRowParser} from '@/lib/DataRowParser';
import {CheckTitlesAreUnique} from "@/lib/checks/file/check_titles_are_unique";

const makeParser = (title: string): DataRowParser => ({
  data: { title },
} as unknown as DataRowParser);

describe('CheckTitlesAreUnique', () => {
  it('marks status valid when all titles are unique', () => {
    const input = {
      '1': makeParser('A'),
      '2': makeParser('B'),
      '3': makeParser('C'),
    };

    const check = new CheckTitlesAreUnique(input);

    expect(check.status).toBe('valid');
    expect(check.errors).toHaveLength(0);
  });

  it('detects a single duplicate title', () => {
    const input = {
      '1': makeParser('Same'),
      '2': makeParser('Same'),
      '3': makeParser('Other'),
    };

    const check = new CheckTitlesAreUnique(input);

    expect(check.status).toBe('error');
    expect(check.errors).toHaveLength(1);
    expect(check.errors[0]).toBeInstanceOf(DataError);
    expect(check.errors[0].message).toMatch(/2 rows titled "Same": 1, 2/);
    expect(check.errors[0].kind).toBe('DuplicateTitleError');
  });

  it('detects multiple duplicate titles', () => {
    const input = {
      '1': makeParser('X'),
      '2': makeParser('X'),
      '3': makeParser('Y'),
      '4': makeParser('Y'),
      '5': makeParser('Z'),
    };

    const check = new CheckTitlesAreUnique(input);

    expect(check.status).toBe('error');
    expect(check.errors).toHaveLength(2);
    expect(check.errors.map((e: Error) => e.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('2 rows titled "X"'),
        expect.stringContaining('2 rows titled "Y"'),
      ])
    );
  });

  it('handles undefined titles safely', () => {
    const input = {
      '1': makeParser(undefined as never),
      '2': makeParser(undefined as never),
    };

    const check = new CheckTitlesAreUnique(input);

    expect(check.status).toBe('error');
    expect(check.errors).toHaveLength(1);
    expect(check.errors[0].message).toMatch(/2 rows titled "undefined"/);
  });
});
