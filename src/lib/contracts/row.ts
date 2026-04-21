import { z } from "zod";

export const canonicalRowFieldNames = [
  "serialNumber",
  "nameMr",
  "nameEn",
  "contributionAmount",
  "placeMr",
  "placeEn"
] as const;

export const voiceCaptureFieldNames = [
  "nameMr",
  "nameEn",
  "contributionAmount",
  "placeMr",
  "placeEn"
] as const;

export type CanonicalRowFieldName = (typeof canonicalRowFieldNames)[number];
export type VoiceCaptureFieldName = (typeof voiceCaptureFieldNames)[number];

export const ContributionRowSchema = z.object({
  id: z.string().min(1),
  serialNumber: z.number().int().positive(),
  nameMr: z.string().trim().min(1),
  nameEn: z.string().trim().min(1),
  contributionAmount: z.number().int().positive(),
  placeMr: z.string().trim().min(1),
  placeEn: z.string().trim().min(1),
  nameMrKey: z.string().trim().min(1),
  placeMrKey: z.string().trim().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const RowDraftSchema = z.object({
  serialNumber: z.number().int().positive(),
  nameMr: z.string().default(""),
  nameEn: z.string().default(""),
  contributionAmount: z.number().int().positive().nullable().default(null),
  placeMr: z.string().default(""),
  placeEn: z.string().default("")
});

export const CreateRowInputSchema = z.object({
  nameMr: z.string().trim().min(1, "Marathi name is required"),
  // Worker A shared contract keeps these fields canonical for duplicate rules and persistence.
  contributionAmount: z.coerce
    .number({ invalid_type_error: "Contribution amount must be numeric" })
    .int("Contribution amount must be numeric")
    .positive("Contribution amount must be a positive number"),
  placeMr: z.string().trim().min(1, "Marathi place is required"),
  nameEn: z.string().trim().min(1, "English name/transliteration is required"),
  placeEn: z.string().trim().min(1, "English place/transliteration is required")
});

export const UpdateRowInputSchema = CreateRowInputSchema.extend({
  id: z.string().min(1)
});

export const DuplicateCheckInputSchema = z.object({
  nameMr: z.string().trim().min(1),
  contributionAmount: z.coerce.number().int().positive(),
  placeMr: z.string().trim().min(1),
  excludeId: z.string().min(1).optional()
});

export const FieldProcessInputSchema = z.object({
  field: z.enum(voiceCaptureFieldNames),
  transcript: z.string().trim().min(1),
  currentDraft: RowDraftSchema.partial().optional()
});

// Alias kept for compatibility with route handlers using an earlier contract name.
export const FieldProcessRequestSchema = FieldProcessInputSchema;

export const FieldProcessResultSchema = z.object({
  cleanedText: z.string().trim().min(1),
  transliteration: z.string().trim().min(1).optional(),
  normalizedAmount: z.number().int().positive().optional(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string())
});

export const TopUpVoiceInputSchema = z.object({
  transcript: z.string().trim().min(1),
  currentDraft: RowDraftSchema.partial().optional()
});

export const TopUpVoiceResultSchema = z.object({
  nameMr: z.string().trim(),
  nameEn: z.string().trim(),
  contributionAmount: z.number().int().positive().nullable(),
  placeMr: z.string().trim(),
  placeEn: z.string().trim(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string())
});

export type ContributionRow = z.infer<typeof ContributionRowSchema>;
export type RowDraft = z.infer<typeof RowDraftSchema>;
export type CreateRowInput = z.infer<typeof CreateRowInputSchema>;
export type UpdateRowInput = z.infer<typeof UpdateRowInputSchema>;
export type DuplicateCheckInput = z.infer<typeof DuplicateCheckInputSchema>;
export type FieldProcessInput = z.infer<typeof FieldProcessInputSchema>;
export type FieldProcessResult = z.infer<typeof FieldProcessResultSchema>;
export type TopUpVoiceInput = z.infer<typeof TopUpVoiceInputSchema>;
export type TopUpVoiceResult = z.infer<typeof TopUpVoiceResultSchema>;
