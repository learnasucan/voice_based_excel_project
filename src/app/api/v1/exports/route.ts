import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      message: "Not implemented: queue export",
      owner: "export-pipeline"
    },
    { status: 501 }
  );
}
