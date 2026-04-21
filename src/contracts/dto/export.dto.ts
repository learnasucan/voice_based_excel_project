import type { ExportFormat, IsoDateTimeString } from "@/contracts/domain/record";

export type ExportJobStatus = "queued" | "processing" | "completed" | "failed";

export interface ExportJobDto {
  id: string;
  recordId: string;
  format: ExportFormat;
  status: ExportJobStatus;
  downloadUrl: string | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface CreateExportJobRequestDto {
  recordId: string;
  format: ExportFormat;
  includeTranscript?: boolean;
  includeSummary?: boolean;
}

export interface CreateExportJobResponseDto {
  job: ExportJobDto;
}
