import { z } from "zod";

export const apiErrorCodes = [
  "DUPLICATE_ROW",
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "INTERNAL_ERROR"
] as const;

export const ApiErrorSchema = z.object({
  code: z.enum(apiErrorCodes),
  message: z.string(),
  details: z.unknown().optional()
});

export type ApiErrorCode = (typeof apiErrorCodes)[number];
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const createApiError = (
  code: ApiErrorCode,
  message: string,
  details?: unknown
): ApiError => ({
  code,
  message,
  details
});
