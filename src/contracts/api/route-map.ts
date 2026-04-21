import type { HealthCheckResponseDto } from "@/contracts/dto/common.dto";
import type {
  CreateRecordRequestDto,
  GenerateSummaryRequestDto,
  GenerateSummaryResponseDto,
  GenerateTranscriptRequestDto,
  GenerateTranscriptResponseDto,
  ListRecordsQueryDto,
  ListRecordsResponseDto,
  RecordDto,
  UpdateRecordRequestDto
} from "@/contracts/dto/record.dto";
import type {
  CreateExportJobRequestDto,
  CreateExportJobResponseDto
} from "@/contracts/dto/export.dto";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface ApiContract<Request, Response> {
  method: HttpMethod;
  path: string;
  summary: string;
  requestExample?: Request;
  responseExample?: Response;
}

export const apiRouteMap = {
  health: {
    method: "GET",
    path: "/api/v1/health",
    summary: "Readiness and timestamp"
  } satisfies ApiContract<void, HealthCheckResponseDto>,
  listRecords: {
    method: "GET",
    path: "/api/v1/records",
    summary: "List records"
  } satisfies ApiContract<ListRecordsQueryDto, ListRecordsResponseDto>,
  createRecord: {
    method: "POST",
    path: "/api/v1/records",
    summary: "Create a new record"
  } satisfies ApiContract<CreateRecordRequestDto, RecordDto>,
  getRecord: {
    method: "GET",
    path: "/api/v1/records/:recordId",
    summary: "Read one record"
  } satisfies ApiContract<void, RecordDto>,
  updateRecord: {
    method: "PATCH",
    path: "/api/v1/records/:recordId",
    summary: "Patch record metadata"
  } satisfies ApiContract<UpdateRecordRequestDto, RecordDto>,
  deleteRecord: {
    method: "DELETE",
    path: "/api/v1/records/:recordId",
    summary: "Delete one record"
  } satisfies ApiContract<void, { success: true }>,
  generateTranscript: {
    method: "POST",
    path: "/api/v1/records/:recordId/transcript",
    summary: "Generate transcript from audio"
  } satisfies ApiContract<GenerateTranscriptRequestDto, GenerateTranscriptResponseDto>,
  generateSummary: {
    method: "POST",
    path: "/api/v1/records/:recordId/summary",
    summary: "Generate summary from transcript"
  } satisfies ApiContract<GenerateSummaryRequestDto, GenerateSummaryResponseDto>,
  createExportJob: {
    method: "POST",
    path: "/api/v1/exports",
    summary: "Queue export generation"
  } satisfies ApiContract<CreateExportJobRequestDto, CreateExportJobResponseDto>
} as const;

export type ApiRouteName = keyof typeof apiRouteMap;
