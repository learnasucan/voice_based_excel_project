import { describe, expect, it } from "vitest";
import { fallbackFieldProcessor } from "@/lib/server/ai/fallbackProcessor";

describe("fallback field processor", () => {
  it("normalizes amount input", async () => {
    const result = await fallbackFieldProcessor.processField({
      field: "contributionAmount",
      transcript: "पाचशे ५००",
      currentDraft: {}
    });

    expect(result.normalizedAmount).toBe(500);
    expect(result.cleanedText).toBe("500");
  });

  it("returns transliteration for Marathi name", async () => {
    const result = await fallbackFieldProcessor.processField({
      field: "nameMr",
      transcript: "गणेश",
      currentDraft: {}
    });

    expect(result.transliteration).toBeTruthy();
  });
});
