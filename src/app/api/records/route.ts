import { NextResponse } from "next/server";
import { z } from "zod";
import {
  RecordMutationResponseSchema,
  RecordsListResponseSchema
} from "@/lib/contracts/api";
import { CreateRowInputSchema } from "@/lib/contracts/row";
import { rowRepository } from "@/lib/server/db/repository";
import { toApiErrorResponse } from "@/app/api/v1/records/responses";

const ListRecordsQuerySchema = z.object({
  search: z.string().trim().default("")
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { search } = ListRecordsQuerySchema.parse({
      search: url.searchParams.get("search") ?? ""
    });

    const result = await rowRepository.listRows(search);

    const payload = RecordsListResponseSchema.parse({
      records: result.rows,
      totalRecords: result.rows.length,
      totalContribution: result.totalAmount,
      nextSerialNumber: result.nextSerialNumber
    });

    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = CreateRowInputSchema.parse(body);
    const createdRow = await rowRepository.createRow(input);
    const payload = RecordMutationResponseSchema.parse({
      record: createdRow
    });

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
