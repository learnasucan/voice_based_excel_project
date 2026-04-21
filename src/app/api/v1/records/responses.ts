import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { apiFailure } from "@/lib/contracts/api";
import { createApiError } from "@/lib/contracts/errors";
import {
  DuplicateRowError,
  RowNotFoundError,
  type RowListResult
} from "@/lib/server/db/repository";

export const rowsListToApiPayload = (result: RowListResult) => ({
  rows: result.rows,
  totalAmount: result.totalAmount,
  nextSerialNumber: result.nextSerialNumber
});

export const toApiErrorResponse = (error: unknown): NextResponse => {
  if (error instanceof DuplicateRowError) {
    return NextResponse.json(
      apiFailure(
        createApiError("DUPLICATE_ROW", error.message, {
          matchedRow: error.matchedRow
        })
      ),
      { status: 409 }
    );
  }

  if (error instanceof RowNotFoundError) {
    return NextResponse.json(apiFailure(createApiError("NOT_FOUND", error.message)), {
      status: 404
    });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      apiFailure(createApiError("VALIDATION_ERROR", "Validation failed", error.flatten())),
      { status: 400 }
    );
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json(
      apiFailure(createApiError("VALIDATION_ERROR", "Request body must be valid JSON")),
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";

  return NextResponse.json(apiFailure(createApiError("INTERNAL_ERROR", message)), {
    status: 500
  });
};
