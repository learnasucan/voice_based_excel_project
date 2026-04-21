export type IsoDateTimeString = string;

export type RecordId = string;

export type RecordSource = "microphone" | "upload" | "manual";

export type RecordStatus = "draft" | "transcribing" | "ready" | "archived";

export type ExportFormat = "txt" | "json" | "pdf" | "docx";

export interface RecordModel {
  id: RecordId;
  title: string;
  source: RecordSource;
  languageCode: string;
  status: RecordStatus;
  transcriptText: string | null;
  summaryText: string | null;
  tags: string[];
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}
