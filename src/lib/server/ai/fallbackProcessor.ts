import { FieldProcessInput, FieldProcessResult } from "@/lib/contracts/row";
import { defaultFieldNormalizationService } from "@/lib/server/ai/fieldNormalizationService";
import { normalizeMarathiText } from "@/lib/server/normalization/marathiText";
import { FieldProcessor } from "@/lib/server/ai/types";

const createFallbackResult = (input: FieldProcessInput): FieldProcessResult => {
  const cleanedText = normalizeMarathiText(input.transcript);
  const warnings: string[] = [];

  if (!cleanedText) {
    warnings.push("No speech captured. Please try recording again.");
  }

  return {
    cleanedText,
    confidence: 0.65,
    warnings
  };
};

export const fallbackFieldProcessor: FieldProcessor = {
  processField: async (input: FieldProcessInput) => {
    if (input.field === "contributionAmount") {
      const result = await defaultFieldNormalizationService.normalizeContributionAmount({
        value: input.transcript
      });

      if (!result.normalizedAmount) {
        return {
          cleanedText: result.cleanedText || normalizeMarathiText(input.transcript),
          confidence: result.confidence || 0.45,
          warnings:
            result.warnings.length > 0
              ? result.warnings
              : ["Could not confidently normalize amount. Please edit manually."]
        };
      }

      return {
        cleanedText: String(result.normalizedAmount),
        normalizedAmount: result.normalizedAmount,
        confidence: result.confidence || 0.75,
        warnings: result.warnings
      };
    }

    if (input.field === "nameMr") {
      const result = await defaultFieldNormalizationService.transliterateNameMr({
        value: input.transcript
      });

      return {
        cleanedText: result.cleanedText || normalizeMarathiText(input.transcript),
        transliteration: result.transliteration,
        confidence: result.confidence || 0.72,
        warnings: result.warnings
      };
    }

    if (input.field === "placeMr") {
      const result = await defaultFieldNormalizationService.transliteratePlaceMr({
        value: input.transcript
      });

      return {
        cleanedText: result.cleanedText || normalizeMarathiText(input.transcript),
        transliteration: result.transliteration,
        confidence: result.confidence || 0.72,
        warnings: result.warnings
      };
    }

    return createFallbackResult(input);
  }
};
