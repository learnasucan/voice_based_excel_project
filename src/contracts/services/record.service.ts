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

export interface RecordService {
  list(input: ListRecordsQueryDto): Promise<ListRecordsResponseDto>;
  get(recordId: string): Promise<RecordDto | null>;
  create(input: CreateRecordRequestDto): Promise<RecordDto>;
  update(recordId: string, input: UpdateRecordRequestDto): Promise<RecordDto>;
  remove(recordId: string): Promise<void>;
  generateTranscript(
    recordId: string,
    input: GenerateTranscriptRequestDto
  ): Promise<GenerateTranscriptResponseDto>;
  generateSummary(
    recordId: string,
    input: GenerateSummaryRequestDto
  ): Promise<GenerateSummaryResponseDto>;
}
