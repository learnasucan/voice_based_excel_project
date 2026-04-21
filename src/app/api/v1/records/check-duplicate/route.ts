import { NextResponse } from "next/server";
import {
  DuplicateCheckRequestSchema,
  DuplicateCheckResponseDataSchema,
  apiSuccess
} from "@/lib/contracts/api";
import { rowRepository } from "@/lib/server/db/repository";
import { toApiErrorResponse } from "@/app/api/v1/records/responses";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = DuplicateCheckRequestSchema.parse(body);
    const matchedRow = await rowRepository.getDuplicateRow(input);

    const data = DuplicateCheckResponseDataSchema.parse({
      isDuplicate: Boolean(matchedRow),
      ...(matchedRow ? { matchedRow } : {})
    });

    return NextResponse.json(apiSuccess(data));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
