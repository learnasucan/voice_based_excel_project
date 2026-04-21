import { NextResponse } from "next/server";
import { z } from "zod";
import {
  RecordDeleteResponseSchema,
  RecordMutationResponseSchema
} from "@/lib/contracts/api";
import { CreateRowInputSchema } from "@/lib/contracts/row";
import { rowRepository } from "@/lib/server/db/repository";
import { toApiErrorResponse } from "@/app/api/v1/records/responses";

const RouteParamsSchema = z.object({
  id: z.string().trim().min(1)
});

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = RouteParamsSchema.parse(await context.params);
    const body = await request.json();
    const input = CreateRowInputSchema.parse(body);

    const updated = await rowRepository.updateRow({
      id,
      ...input
    });

    const payload = RecordMutationResponseSchema.parse({
      record: updated
    });

    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

// Keep legacy `/api/records/:id` update clients compatible with PATCH semantics.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = RouteParamsSchema.parse(await context.params);
    await rowRepository.deleteRow(id);
    const payload = RecordDeleteResponseSchema.parse({ success: true, id });

    return NextResponse.json(payload);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
