import type { RecordModel, RecordSource } from "@/contracts/domain/record";
import type { CursorPaginationMetaDto } from "@/contracts/dto/common.dto";

export type RecordDto = RecordModel;

export interface ListRecordsQueryDto {
  limit?: number;
  cursor?: string;
  status?: RecordDto["status"];
  search?: string;
}

export interface ListRecordsResponseDto {
  items: RecordDto[];
  page: CursorPaginationMetaDto;
}

export interface GetRecordParamsDto {
  recordId: string;
}

export interface CreateRecordRequestDto {
  title: string;
  source: RecordSource;
  languageCode: string;
  tags?: string[];
}

export interface UpdateRecordRequestDto {
  title?: string;
  languageCode?: string;
  tags?: string[];
  status?: RecordDto["status"];
}

export interface GenerateTranscriptRequestDto {
  audioUrl: string;
  languageCode?: string;
}

export interface GenerateTranscriptResponseDto {
  recordId: string;
  transcriptText: string;
}

export interface GenerateSummaryRequestDto {
  style?: "short" | "detailed" | "action-items";
}

export interface GenerateSummaryResponseDto {
  recordId: string;
  summaryText: string;
}
