import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { CreateRowInputSchema } from "@/lib/contracts/row";
import {
  duplicateResponse,
  internalErrorResponse,
  notFoundResponse,
  okResponse,
  validationErrorResponse
} from "@/lib/server/apiResponse";
import {
  DuplicateRowError,
  rowRepository,
  RowNotFoundError
} from "@/lib/server/db/repository";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsedBody = CreateRowInputSchema.parse(body);

    const updated = await rowRepository.updateRow({
      id,
      ...parsedBody
    });

    return okResponse(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof DuplicateRowError) {
      return duplicateResponse("Duplicate row detected for name, amount, and place", error.matchedRow);
    }

    if (error instanceof RowNotFoundError) {
      return notFoundResponse("Row not found");
    }

    return internalErrorResponse("Failed to update row");
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await rowRepository.deleteRow(id);
    return okResponse({ id });
  } catch (error) {
    if (error instanceof RowNotFoundError) {
      return notFoundResponse("Row not found");
    }

    return internalErrorResponse("Failed to delete row");
  }
}
