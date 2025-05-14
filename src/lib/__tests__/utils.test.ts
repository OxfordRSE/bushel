import {fuzzyCoerce, stringToFuzzyRegex} from "@/lib/utils";
import {describe, expect, it} from "vitest";

describe("stringToFuzzyRegex", () => {
    it("should convert a string to a fuzzy regex", () => {
        const s = "test string";
        const r = stringToFuzzyRegex(s);
        expect(r).toBeInstanceOf(RegExp);
        expect(r.test(s)).toBe(true);
        expect(r.test(s.toUpperCase())).toBe(true);
        expect(r.test(s + ".")).toBe(true);
        expect(r.test(s.replace(" ", "-"))).toBe(true);
        expect(r.test(s + "!")).toBe(false);
    });

    it("should handle special characters", () => {
        const s = "test ?string(";
        const r = stringToFuzzyRegex(s);
        expect(r).toBeInstanceOf(RegExp);
        expect(r.test(s)).toBe(true);
    });

    it("should handle licenses", () => {
        const s = "CC BY-NC-SA 4.0";
        const r = stringToFuzzyRegex(s);
        expect(r.test("CC-BY-NC-SA 4.0.")).toBe(true);
    })
});


describe('fuzzyCoerce', () => {
  it('returns matched target value', () => {
    const result = fuzzyCoerce('  apple ', ['apple', 'banana']);
    expect(result).toBe('apple');
  });

  it('returns original value if no match', () => {
    const result = fuzzyCoerce('carrot', ['apple', 'banana']);
    expect(result).toBe('carrot');
  });

  it('does not clean value when clean_value=false', () => {
    const result = fuzzyCoerce('ap ple', ['apple'], false);
    expect(result).toBe('ap ple'); // space remains mismatch
  });

  it('respects compiled regexs if provided', () => {
    const regex = [/^dog$/i, /^cat$/i];
    const result = fuzzyCoerce('Dog', ['dog', 'cat'], true, regex);
    expect(result).toBe('dog');
  });

  it('throws if target_values and compiled_regexs lengths mismatch', () => {
    const regex = [/dog/i];
    expect(() =>
      fuzzyCoerce('Dog', ['dog', 'cat'], true, regex)
    ).toThrowError('Compiled regexs and target values must be the same length');
  });

  it('matches based on dynamically generated regexs if compiled_regexs is not provided', () => {
    const result = fuzzyCoerce('BANANA', ['apple', 'banana']);
    expect(result).toBe('banana');
  });
});