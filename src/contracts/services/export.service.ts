import type {
  CreateExportJobRequestDto,
  CreateExportJobResponseDto,
  ExportJobDto
} from "@/contracts/dto/export.dto";

export interface ExportService {
  queueExport(input: CreateExportJobRequestDto): Promise<CreateExportJobResponseDto>;
  getJob(jobId: string): Promise<ExportJobDto | null>;
}
