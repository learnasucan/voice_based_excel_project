import { NextResponse } from "next/server";
import { RecordSummaryResponseSchema } from "@/lib/contracts/api";
import { rowRepository } from "@/lib/server/db/repository";
import { toApiErrorResponse } from "@/app/api/v1/records/responses";

export const runtime = "nodejs";

export async function GET() {
  try {
    const summary = await rowRepository.getSummary();
    const payload = RecordSummaryResponseSchema.parse(summary);
    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
