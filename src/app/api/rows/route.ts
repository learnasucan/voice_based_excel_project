import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { CreateRowInputSchema } from "@/lib/contracts/row";
import {
  duplicateResponse,
  internalErrorResponse,
  okResponse,
  validationErrorResponse
} from "@/lib/server/apiResponse";
import { DuplicateRowError, rowRepository } from "@/lib/server/db/repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") ?? "";
    const result = await rowRepository.listRows(search);
    return okResponse(result);
  } catch {
    return internalErrorResponse("Failed to load rows");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = CreateRowInputSchema.parse(body);
    const created = await rowRepository.createRow(payload);
    return okResponse(created, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    if (error instanceof DuplicateRowError) {
      return duplicateResponse("Duplicate row detected for name, amount, and place", error.matchedRow);
    }

    return internalErrorResponse("Failed to create row");
  }
}
