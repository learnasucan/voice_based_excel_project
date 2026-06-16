import { describe, expect, it } from "vitest";
import {
  buildNormalizedDuplicateKey,
  normalizeAmountInput,
  normalizeTextKey,
  transliterateMarathiToEnglish
} from "@/lib/server/normalization/rowNormalization";

describe("row normalization", () => {
  it("normalizes duplicate key fields", () => {
    const key = buildNormalizedDuplicateKey({
      nameMr: "  वैभव   जगताप ",
      contributionAmount: 500,
      placeMr: " पुणे "
    });

    expect(key.nameMrKey).toBe(normalizeTextKey("वैभव जगताप"));
    expect(key.placeMrKey).toBe(normalizeTextKey("पुणे"));
    expect(key.contributionAmount).toBe(500);
  });

  it("normalizes devanagari amount digits", () => {
    expect(normalizeAmountInput("५००")).toBe(500);
    expect(normalizeAmountInput("  २५००/- ")).toBe(2500);
  });

  it("creates transliteration for Marathi strings", () => {
    const value = transliterateMarathiToEnglish("पुणे");
    expect(value.length).toBeGreaterThan(0);
  });

  it("improves phonetic transliteration for known schwa/anusvara cases", () => {
    expect(transliterateMarathiToEnglish("मयंक")).toBe("Mayank");
    expect(transliterateMarathiToEnglish("कुमार")).toBe("Kumar");
    expect(transliterateMarathiToEnglish("प्रदेश")).toBe("Pradesh");
  });

  it("transliterates full names/places closer to expected phonetics", () => {
    expect(transliterateMarathiToEnglish("मयंक कुमार मोदी")).toBe("Mayank Kumar Modi");
    expect(transliterateMarathiToEnglish("मध्य प्रदेश")).toBe("Madhya Pradesh");
    expect(transliterateMarathiToEnglish("रचित शंकर पाटील")).toBe("Rachit Shankar Patil");
  });
});
