import { MarathiFieldName } from "@/contracts/services/ai.service";

export interface ProviderTextResult {
  value: string;
  confidence: number;
  warnings?: string[];
}

export interface ProviderAmountResult {
  value: number | null;
  confidence: number;
  warnings?: string[];
}

export interface FieldNormalizationProvider {
  readonly providerName: string;
  cleanupMarathiText(field: MarathiFieldName, value: string): Promise<ProviderTextResult>;
  transliterateMarathi(
    field: MarathiFieldName,
    value: string,
    overrides?: Record<string, string>
  ): Promise<ProviderTextResult & { overrideApplied?: boolean }>;
  normalizeAmount(value: string): Promise<ProviderAmountResult>;
}
