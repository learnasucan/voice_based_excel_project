import { ZodError } from "zod";
import { NextResponse } from "next/server";
import { apiFailure, apiSuccess } from "@/lib/contracts/api";
import { createApiError } from "@/lib/contracts/errors";

export const validationErrorResponse = (error: ZodError) =>
  NextResponse.json(
    apiFailure(
      createApiError("VALIDATION_ERROR", "Request validation failed", error.flatten())
    ),
    { status: 400 }
  );

export const internalErrorResponse = (message = "Unexpected server error") =>
  NextResponse.json(
    apiFailure(createApiError("INTERNAL_ERROR", message)),
    { status: 500 }
  );

export const notFoundResponse = (message = "Resource not found") =>
  NextResponse.json(
    apiFailure(createApiError("NOT_FOUND", message)),
    { status: 404 }
  );

export const duplicateResponse = (message: string, matchedRow?: unknown) =>
  NextResponse.json(
    apiFailure(createApiError("DUPLICATE_ROW", message, { matchedRow })),
    { status: 409 }
  );

export const okResponse = <T>(data: T, status = 200) =>
  NextResponse.json(apiSuccess(data), { status });
