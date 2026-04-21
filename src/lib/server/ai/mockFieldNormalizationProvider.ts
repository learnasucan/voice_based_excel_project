import { MarathiFieldName } from "@/contracts/services/ai.service";
import {
  FieldNormalizationProvider,
  ProviderAmountResult,
  ProviderTextResult
} from "@/lib/server/ai/fieldNormalizationProvider";
import { normalizeContributionAmountText } from "@/lib/server/normalization/amountNormalization";
import { bestEffortTransliterateMr } from "@/lib/server/normalization/marathiTransliteration";
import { normalizeNameMrText, normalizePlaceMrText } from "@/lib/server/normalization/marathiText";

const boundConfidence = (value: number): number => Math.max(0, Math.min(1, value));

export class MockFieldNormalizationProvider implements FieldNormalizationProvider {
  readonly providerName = "mock-local";

  async cleanupMarathiText(field: MarathiFieldName, value: string): Promise<ProviderTextResult> {
    if (field === "nameMr") {
      return {
        value: normalizeNameMrText(value),
        confidence: 1,
        warnings: ["mock-cleanup"]
      };
    }

    return {
      value: normalizePlaceMrText(value),
      confidence: 1,
      warnings: ["mock-cleanup"]
    };
  }

  async transliterateMarathi(
    _field: MarathiFieldName,
    value: string,
    overrides: Record<string, string> = {}
  ): Promise<ProviderTextResult & { overrideApplied?: boolean }> {
    const result = bestEffortTransliterateMr(value, overrides);
    const warnings = ["mock-transliteration"];

    if (result.overrideApplied) {
      warnings.push("override-applied");
    }

    return {
      value: result.transliteratedText,
      confidence: boundConfidence(result.overrideApplied ? 0.9 : 0.72),
      warnings,
      overrideApplied: result.overrideApplied
    };
  }

  async normalizeAmount(value: string): Promise<ProviderAmountResult> {
    const result = normalizeContributionAmountText(value);
    if (result.normalizedAmount === null) {
      return {
        value: null,
        confidence: 0,
        warnings: [result.mode]
      };
    }

    return {
      value: result.normalizedAmount,
      confidence: 0.85,
      warnings: [result.mode]
    };
  }
}
