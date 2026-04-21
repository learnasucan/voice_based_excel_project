import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSuccess } from "@/lib/contracts/api";
import { CreateRowInputSchema } from "@/lib/contracts/row";
import { rowRepository } from "@/lib/server/db/repository";
import { rowsListToApiPayload, toApiErrorResponse } from "@/app/api/v1/records/responses";

const ListRowsQuerySchema = z.object({
  search: z.string().trim().default("")
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { search } = ListRowsQuerySchema.parse({
      search: url.searchParams.get("search") ?? ""
    });

    const result = await rowRepository.listRows(search);
    return NextResponse.json(apiSuccess(rowsListToApiPayload(result)));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = CreateRowInputSchema.parse(body);
    const createdRow = await rowRepository.createRow(input);
    return NextResponse.json(apiSuccess(createdRow), { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
