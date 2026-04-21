import { describe, expect, it } from "vitest";
import { DefaultFieldNormalizationService } from "@/lib/server/ai/fieldNormalizationService";
import {
  normalizeContributionAmount,
  normalizeNameMr,
  normalizePlaceMr,
  transliterateNameMr,
  transliteratePlaceMr
} from "@/lib/server/ai/fieldNormalizationApi";

const service = new DefaultFieldNormalizationService();

describe("field normalization service (Worker D)", () => {
  it("normalizes Marathi name text", async () => {
    const result = await service.normalizeNameMr({
      value: "१२)   गणेश   शिंदे"
    });

    expect(result.cleanedText).toBe("गणेश शिंदे");
    expect(result.providerName).toBe("mock-local");
  });

  it("transliterates Marathi name with proper noun override", async () => {
    const result = await service.transliterateNameMr({
      value: "शिवाजी शिंदे",
      properNounOverrides: {
        "शिवाजी": "Shivaji"
      }
    });

    expect(result.transliteration).toContain("Shivaji");
    expect(result.overrideApplied).toBe(true);
  });

  it("normalizes Marathi place and transliterates best-effort", async () => {
    const normalized = await service.normalizePlaceMr({ value: "  ५. पुणे , महाराष्ट्र " });
    const transliterated = await service.transliteratePlaceMr({ value: normalized.cleanedText });

    expect(normalized.cleanedText).toBe("पुणे, महाराष्ट्र");
    expect(transliterated.transliteration?.length).toBeGreaterThan(0);
  });

  it("normalizes Marathi spoken amount", async () => {
    const result = await service.normalizeContributionAmount({
      value: "दोन हजार पाचशे पन्नास रुपये"
    });

    expect(result.normalizedAmount).toBe(2550);
    expect(result.cleanedText).toBe("2550");
  });

  it("normalizes English spoken and mixed numeric amount", async () => {
    const spoken = await service.normalizeContributionAmount({ value: "two thousand five hundred" });
    const mixed = await service.normalizeContributionAmount({ value: "₹ २,५००/-" });

    expect(spoken.normalizedAmount).toBe(2500);
    expect(mixed.normalizedAmount).toBe(2500);
  });

  it("normalizes Hindi spoken amount", async () => {
    const result = await service.normalizeContributionAmount({
      value: "दो हजार पांच सौ"
    });

    expect(result.normalizedAmount).toBe(2500);
  });

  it("exposes expected interface functions", async () => {
    const n1 = await normalizeNameMr({ value: "१) राम" });
    const t1 = await transliterateNameMr({ value: "राम" });
    const n2 = await normalizePlaceMr({ value: "२) पुणे" });
    const t2 = await transliteratePlaceMr({ value: "पुणे" });
    const a1 = await normalizeContributionAmount({ value: "one hundred" });

    expect(n1.cleanedText).toBe("राम");
    expect(t1.transliteration).toBeTruthy();
    expect(n2.cleanedText).toBe("पुणे");
    expect(t2.transliteration).toBeTruthy();
    expect(a1.normalizedAmount).toBe(100);
  });
});
