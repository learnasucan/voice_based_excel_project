import {
  FieldNormalizationInput,
  FieldNormalizationOutput,
  FieldNormalizationService
} from "@/contracts/services/ai.service";
import { FieldNormalizationProvider } from "@/lib/server/ai/fieldNormalizationProvider";
import { MockFieldNormalizationProvider } from "@/lib/server/ai/mockFieldNormalizationProvider";
import { normalizeContributionAmountText } from "@/lib/server/normalization/amountNormalization";
import { normalizeNameMrText, normalizePlaceMrText } from "@/lib/server/normalization/marathiText";

const clampConfidence = (value: number): number => Math.max(0, Math.min(1, value));

const coerceInput = (input: FieldNormalizationInput | string | number | null | undefined): FieldNormalizationInput =>
  typeof input === "object" && input !== null && "value" in input
    ? input
    : {
        value: input
      };

const toRawText = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  return String(value).trim();
};

const emptyOutput = (providerName: string, rawValue: string): FieldNormalizationOutput => ({
  rawValue,
  cleanedText: "",
  confidence: 0,
  warnings: ["empty-input"],
  providerName,
  bestEffort: true
});

const mergeWarnings = (...warningGroups: Array<string[] | undefined>): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const group of warningGroups) {
    for (const warning of group ?? []) {
      const trimmed = warning.trim();
      if (!trimmed || seen.has(trimmed)) {
        continue;
      }
      seen.add(trimmed);
      output.push(trimmed);
    }
  }

  return output;
};

export class DefaultFieldNormalizationService implements FieldNormalizationService {
  readonly providerName: string;

  constructor(private readonly provider: FieldNormalizationProvider = new MockFieldNormalizationProvider()) {
    this.providerName = provider.providerName;
  }

  async normalizeNameMr(input: FieldNormalizationInput): Promise<FieldNormalizationOutput> {
    const request = coerceInput(input);
    const rawValue = toRawText(request.value);
    if (!rawValue) {
      return emptyOutput(this.providerName, rawValue);
    }

    const localCleaned = normalizeNameMrText(rawValue);
    const providerResult = await this.provider.cleanupMarathiText("nameMr", localCleaned);
    const cleanedText = normalizeNameMrText(providerResult.value || localCleaned);

    return {
      rawValue,
      cleanedText,
      confidence: clampConfidence(providerResult.confidence || 0.8),
      warnings: mergeWarnings(providerResult.warnings),
      providerName: this.providerName,
      bestEffort: false
    };
  }

  async transliterateNameMr(input: FieldNormalizationInput): Promise<FieldNormalizationOutput> {
    const request = coerceInput(input);
    const base = await this.normalizeNameMr(request);
    if (!base.cleanedText) {
      return base;
    }

    const providerResult = await this.provider.transliterateMarathi(
      "nameMr",
      base.cleanedText,
      request.properNounOverrides
    );

    const transliteration = providerResult.value.trim();
    return {
      ...base,
      transliteration,
      confidence: clampConfidence(providerResult.confidence || 0.65),
      warnings: mergeWarnings(base.warnings, providerResult.warnings),
      bestEffort: true,
      overrideApplied: Boolean(providerResult.overrideApplied)
    };
  }

  async normalizePlaceMr(input: FieldNormalizationInput): Promise<FieldNormalizationOutput> {
    const request = coerceInput(input);
    const rawValue = toRawText(request.value);
    if (!rawValue) {
      return emptyOutput(this.providerName, rawValue);
    }

    const localCleaned = normalizePlaceMrText(rawValue);
    const providerResult = await this.provider.cleanupMarathiText("placeMr", localCleaned);
    const cleanedText = normalizePlaceMrText(providerResult.value || localCleaned);

    return {
      rawValue,
      cleanedText,
      confidence: clampConfidence(providerResult.confidence || 0.8),
      warnings: mergeWarnings(providerResult.warnings),
      providerName: this.providerName,
      bestEffort: false
    };
  }

  async transliteratePlaceMr(input: FieldNormalizationInput): Promise<FieldNormalizationOutput> {
    const request = coerceInput(input);
    const base = await this.normalizePlaceMr(request);
    if (!base.cleanedText) {
      return base;
    }

    const providerResult = await this.provider.transliterateMarathi(
      "placeMr",
      base.cleanedText,
      request.properNounOverrides
    );

    const transliteration = providerResult.value.trim();
    return {
      ...base,
      transliteration,
      confidence: clampConfidence(providerResult.confidence || 0.65),
      warnings: mergeWarnings(base.warnings, providerResult.warnings),
      bestEffort: true,
      overrideApplied: Boolean(providerResult.overrideApplied)
    };
  }

  async normalizeContributionAmount(input: FieldNormalizationInput): Promise<FieldNormalizationOutput> {
    const request = coerceInput(input);
    const rawValue = toRawText(request.value);
    if (!rawValue) {
      return emptyOutput(this.providerName, rawValue);
    }

    const local = normalizeContributionAmountText(rawValue);
    if (local.normalizedAmount !== null) {
      return {
        rawValue,
        cleanedText: String(local.normalizedAmount),
        normalizedAmount: local.normalizedAmount,
        confidence: 0.82,
        warnings: [local.mode],
        providerName: this.providerName,
        bestEffort: true
      };
    }

    const providerResult = await this.provider.normalizeAmount(rawValue);
    if (providerResult.value !== null) {
      return {
        rawValue,
        cleanedText: String(providerResult.value),
        normalizedAmount: providerResult.value,
        confidence: clampConfidence(providerResult.confidence || 0.7),
        warnings: mergeWarnings([local.mode], providerResult.warnings),
        providerName: this.providerName,
        bestEffort: true
      };
    }

    return {
      rawValue,
      cleanedText: rawValue,
      confidence: clampConfidence(providerResult.confidence || 0.35),
      warnings: mergeWarnings([local.mode], providerResult.warnings, ["amount-unparsed"]),
      providerName: this.providerName,
      bestEffort: true
    };
  }
}

export const defaultFieldNormalizationService: FieldNormalizationService = new DefaultFieldNormalizationService();
