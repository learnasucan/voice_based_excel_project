import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSuccess } from "@/lib/contracts/api";
import { UpdateRowInputSchema } from "@/lib/contracts/row";
import { RowNotFoundError, rowRepository } from "@/lib/server/db/repository";
import { toApiErrorResponse } from "@/app/api/v1/records/responses";

type RouteContext = { params: Promise<{ recordId: string }> };

const RouteParamsSchema = z.object({
  recordId: z.string().trim().min(1)
});

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { recordId } = RouteParamsSchema.parse(await context.params);
    const row = await rowRepository.getRowById(recordId);

    if (!row) {
      return toApiErrorResponse(new RowNotFoundError("Row not found"));
    }

    return NextResponse.json(apiSuccess(row));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { recordId } = RouteParamsSchema.parse(await context.params);
    const body = await request.json();
    const input = UpdateRowInputSchema.parse({
      ...body,
      id: recordId
    });
    const updated = await rowRepository.updateRow(input);
    return NextResponse.json(apiSuccess(updated));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  return PATCH(request, context);
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { recordId } = RouteParamsSchema.parse(await context.params);
    await rowRepository.deleteRow(recordId);
    return NextResponse.json(apiSuccess({ id: recordId }));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
