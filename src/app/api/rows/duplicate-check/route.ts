import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { DuplicateCheckRequestSchema } from "@/lib/contracts/api";
import {
  internalErrorResponse,
  okResponse,
  validationErrorResponse
} from "@/lib/server/apiResponse";
import { rowRepository } from "@/lib/server/db/repository";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = DuplicateCheckRequestSchema.parse(body);
    const matchedRow = await rowRepository.getDuplicateRow(payload);

    return okResponse({
      isDuplicate: Boolean(matchedRow),
      matchedRow: matchedRow ?? undefined
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return internalErrorResponse("Failed to check duplicate");
  }
}
