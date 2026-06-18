import { z } from "zod";

export const entryTypes = ["cash", "gift", "cash_and_gift", "unknown"] as const;
export const EntryTypeSchema = z.enum(entryTypes);
export type EntryType = z.infer<typeof EntryTypeSchema>;

export const canonicalRowFieldNames = [
  "serialNumber",
  "nameMr",
  "nameEn",
  "entryType",
  "contributionAmount",
  "giftNameMr",
  "giftNameEn",
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
  entryType: EntryTypeSchema.default("cash"),
  contributionAmount: z.number().int().positive().nullable(),
  giftNameMr: z.string().trim().nullable().default(null),
  giftNameEn: z.string().trim().nullable().default(null),
  placeMr: z.string().trim(),
  placeEn: z.string().trim(),
  nameMrKey: z.string().trim().min(1),
  placeMrKey: z.string().trim(),
  giftNameMrKey: z.string().trim().nullable().default(null),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const RowDraftSchema = z.object({
  serialNumber: z.number().int().positive(),
  nameMr: z.string().default(""),
  nameEn: z.string().default(""),
  entryType: EntryTypeSchema.default("cash"),
  contributionAmount: z.number().int().positive().nullable().default(null),
  giftNameMr: z.string().nullable().default(null),
  giftNameEn: z.string().nullable().default(null),
  placeMr: z.string().default(""),
  placeEn: z.string().default("")
});

const RowMutationBaseSchema = z.object({
    nameMr: z.string().trim().min(1, "Marathi name is required"),
    nameEn: z.string().trim().min(1, "English name/transliteration is required"),
    entryType: EntryTypeSchema.default("cash"),
    contributionAmount: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      z.coerce
        .number({ invalid_type_error: "Contribution amount must be numeric" })
        .int("Contribution amount must be numeric")
        .positive("Contribution amount must be a positive number")
        .nullable()
    ),
    giftNameMr: z.string().trim().nullable().optional().default(null),
    giftNameEn: z.string().trim().nullable().optional().default(null),
    placeMr: z.string().trim().default(""),
    placeEn: z.string().trim().default("")
  });

const validateRowMutation = (
  value: z.infer<typeof RowMutationBaseSchema>,
  context: z.RefinementCtx
) => {
    if ((value.entryType === "cash" || value.entryType === "cash_and_gift") && !value.contributionAmount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contributionAmount"],
        message: "Amount is required for cash entries"
      });
    }

    if ((value.entryType === "gift" || value.entryType === "cash_and_gift") && !value.giftNameMr?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["giftNameMr"],
        message: "Gift name is required for gift entries"
      });
    }

    if (value.entryType === "cash" && !value.placeMr.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["placeMr"],
        message: "Marathi place is required for cash entries"
      });
    }

    if (value.entryType === "cash" && !value.placeEn.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["placeEn"],
        message: "English place/transliteration is required for cash entries"
      });
    }
  };

export const CreateRowInputSchema = RowMutationBaseSchema.superRefine(validateRowMutation);

export const UpdateRowInputSchema = RowMutationBaseSchema.extend({
  id: z.string().min(1)
}).superRefine(validateRowMutation);

export const DuplicateCheckInputSchema = z.object({
  entryType: EntryTypeSchema.default("cash"),
  nameMr: z.string().trim().min(1),
  contributionAmount: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce.number().int().positive().nullable()
  ),
  giftNameMr: z.string().trim().nullable().optional().default(null),
  placeMr: z.string().trim().default(""),
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
  entryType: EntryTypeSchema.default("cash"),
  contributionAmount: z.number().int().positive().nullable(),
  giftNameMr: z.string().trim().nullable().default(null),
  giftNameEn: z.string().trim().nullable().default(null),
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
