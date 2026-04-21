import { NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  TopUpVoiceInputSchema,
  TopUpVoiceResultSchema
} from "@/lib/contracts/row";
import {
  internalErrorResponse,
  okResponse,
  validationErrorResponse
} from "@/lib/server/apiResponse";
import { processVoiceTopUpWithAi } from "@/lib/server/ai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = TopUpVoiceInputSchema.parse(body);

    const result = await processVoiceTopUpWithAi(payload);
    const sanitized = TopUpVoiceResultSchema.parse(result);

    return okResponse(sanitized);
  } catch (error) {
    if (error instanceof ZodError) {
      return validationErrorResponse(error);
    }

    return internalErrorResponse("Failed to process top-up voice input");
  }
}
