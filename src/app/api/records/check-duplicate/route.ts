import { NextResponse } from "next/server";
import {
  DuplicateCheckFlatResponseSchema,
  DuplicateCheckRequestSchema
} from "@/lib/contracts/api";
import { rowRepository } from "@/lib/server/db/repository";
import { toApiErrorResponse } from "@/app/api/v1/records/responses";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = DuplicateCheckRequestSchema.parse(body);
    const matchedRow = await rowRepository.getDuplicateRow(payload);
    const response = DuplicateCheckFlatResponseSchema.parse({
      isDuplicate: Boolean(matchedRow),
      matchedRow: matchedRow ?? null
    });

    return NextResponse.json(response);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
