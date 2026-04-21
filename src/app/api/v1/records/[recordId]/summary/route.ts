import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ recordId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { recordId } = await context.params;

  return NextResponse.json(
    {
      message: "Not implemented: generate summary",
      recordId,
      owner: "ai-integration"
    },
    { status: 501 }
  );
}
