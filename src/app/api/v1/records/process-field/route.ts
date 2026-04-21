import { NextResponse } from "next/server";
import {
  FieldProcessRequestSchema,
  FieldProcessResponseDataSchema,
  apiSuccess
} from "@/lib/contracts/api";
import { processFieldWithAi } from "@/lib/server/ai";
import { toApiErrorResponse } from "@/app/api/v1/records/responses";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = FieldProcessRequestSchema.parse(body);
    const processed = await processFieldWithAi(input);

    const data = FieldProcessResponseDataSchema.parse(processed);
    return NextResponse.json(apiSuccess(data));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
