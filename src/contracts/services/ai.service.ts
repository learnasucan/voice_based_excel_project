export interface SummaryPromptInput {
  transcriptText: string;
  style?: "short" | "detailed" | "action-items";
}

export interface SummaryPromptResult {
  summaryText: string;
}

export interface AIService {
  readonly providerName: string;
  summarize(input: SummaryPromptInput): Promise<SummaryPromptResult>;
}

export type MarathiFieldName = "nameMr" | "placeMr";

export interface FieldNormalizationInput {
  value: string | number | null | undefined;
  properNounOverrides?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface FieldNormalizationOutput {
  rawValue: string;
  cleanedText: string;
  transliteration?: string;
  normalizedAmount?: number;
  confidence: number;
  warnings: string[];
  providerName: string;
  bestEffort: boolean;
  overrideApplied?: boolean;
}

export interface FieldNormalizationService {
  readonly providerName: string;
  normalizeNameMr(input: FieldNormalizationInput): Promise<FieldNormalizationOutput>;
  transliterateNameMr(input: FieldNormalizationInput): Promise<FieldNormalizationOutput>;
  normalizePlaceMr(input: FieldNormalizationInput): Promise<FieldNormalizationOutput>;
  transliteratePlaceMr(input: FieldNormalizationInput): Promise<FieldNormalizationOutput>;
  normalizeContributionAmount(input: FieldNormalizationInput): Promise<FieldNormalizationOutput>;
}
