import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { FieldProcessInputSchema, FieldProcessResultSchema } from "@/lib/contracts/row";
import {
  internalErrorResponse,
  okResponse,
  validationErrorResponse
} from "@/lib/server/apiResponse";
import { processFieldWithAi } from "@/lib/server/ai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = FieldProcessInputSchema.parse(body);

    const result = await processFieldWithAi(payload);
    const sanitized = FieldProcessResultSchema.parse(result);

    return okResponse(sanitized);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return internalErrorResponse("Failed to process voice field");
  }
}
