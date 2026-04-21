import {
  FieldNormalizationInput,
  FieldNormalizationOutput
} from "@/contracts/services/ai.service";
import { defaultFieldNormalizationService } from "@/lib/server/ai/fieldNormalizationService";

export const normalizeNameMr = (input: FieldNormalizationInput): Promise<FieldNormalizationOutput> =>
  defaultFieldNormalizationService.normalizeNameMr(input);

export const transliterateNameMr = (input: FieldNormalizationInput): Promise<FieldNormalizationOutput> =>
  defaultFieldNormalizationService.transliterateNameMr(input);

export const normalizePlaceMr = (input: FieldNormalizationInput): Promise<FieldNormalizationOutput> =>
  defaultFieldNormalizationService.normalizePlaceMr(input);

export const transliteratePlaceMr = (input: FieldNormalizationInput): Promise<FieldNormalizationOutput> =>
  defaultFieldNormalizationService.transliteratePlaceMr(input);

export const normalizeContributionAmount = (
  input: FieldNormalizationInput
): Promise<FieldNormalizationOutput> => defaultFieldNormalizationService.normalizeContributionAmount(input);
