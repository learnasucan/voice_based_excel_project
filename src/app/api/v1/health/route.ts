import { NextResponse } from "next/server";
import type { HealthCheckResponseDto } from "@/contracts/dto/common.dto";

export async function GET() {
  const payload: HealthCheckResponseDto = {
    status: "ok",
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(payload);
}
