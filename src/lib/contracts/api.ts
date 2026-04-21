import { z } from "zod";
import { ApiErrorSchema } from "@/lib/contracts/errors";
import {
  ContributionRowSchema,
  DuplicateCheckInputSchema,
  FieldProcessInputSchema,
  FieldProcessResultSchema,
  TopUpVoiceInputSchema,
  TopUpVoiceResultSchema
} from "@/lib/contracts/row";

export const ApiSuccessEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema
  });

export const ApiErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema
});

export const RowsListDataSchema = z.object({
  rows: z.array(ContributionRowSchema),
  totalAmount: z.number().int().nonnegative(),
  nextSerialNumber: z.number().int().positive()
});

export const RowsListResponseSchema = z.union([
  ApiSuccessEnvelopeSchema(RowsListDataSchema),
  ApiErrorEnvelopeSchema
]);

export const RecordsListResponseSchema = z.object({
  records: z.array(ContributionRowSchema),
  totalRecords: z.number().int().nonnegative(),
  totalContribution: z.number().nonnegative(),
  nextSerialNumber: z.number().int().positive()
});

export const RecordMutationResponseSchema = z.object({
  record: ContributionRowSchema
});

export const RecordDeleteResponseSchema = z.object({
  success: z.literal(true),
  id: z.string().min(1)
});

export const RecordSummaryResponseSchema = z.object({
  totalRecords: z.number().int().nonnegative(),
  totalContribution: z.number().nonnegative(),
  lastSerialNumber: z.number().int().nonnegative(),
  nextSerialNumber: z.number().int().positive()
});

export const DuplicateCheckResponseDataSchema = z.object({
  isDuplicate: z.boolean(),
  matchedRow: ContributionRowSchema.optional()
});

export const DuplicateCheckFlatResponseSchema = z.object({
  isDuplicate: z.boolean(),
  matchedRow: ContributionRowSchema.nullable()
});

export const DuplicateCheckRequestSchema = DuplicateCheckInputSchema;

export const FieldProcessRequestSchema = FieldProcessInputSchema;

export const FieldProcessResponseDataSchema = FieldProcessResultSchema;

export const TopUpVoiceRequestSchema = TopUpVoiceInputSchema;

export const TopUpVoiceResponseDataSchema = TopUpVoiceResultSchema;

export const CreateRowResponseDataSchema = ContributionRowSchema;
export const UpdateRowResponseDataSchema = ContributionRowSchema;
export const DeleteRowResponseDataSchema = z.object({
  id: z.string().min(1)
});

export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
};

export type ApiErrorEnvelope = {
  success: false;
  error: z.infer<typeof ApiErrorSchema>;
};

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export const apiSuccess = <T>(data: T): ApiSuccessEnvelope<T> => ({
  success: true,
  data
});

export const apiFailure = (error: z.infer<typeof ApiErrorSchema>): ApiErrorEnvelope => ({
  success: false,
  error
});
