import {stringToFuzzyRegex} from "@/lib/utils";
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
