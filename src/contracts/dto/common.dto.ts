import type { IsoDateTimeString } from "@/contracts/domain/record";

export interface ApiErrorDto {
  code: string;
  message: string;
  details?: unknown;
}

export interface CursorPaginationQueryDto {
  limit?: number;
  cursor?: string;
}

export interface CursorPaginationMetaDto {
  nextCursor: string | null;
  totalCount?: number;
}

export interface HealthCheckResponseDto {
  status: "ok";
  timestamp: IsoDateTimeString;
}
