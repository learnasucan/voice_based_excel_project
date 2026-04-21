# API Route Map

| Method | Path | Request DTO | Response DTO | Owner Lane |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/health` | - | `HealthCheckResponseDto` | platform |
| GET | `/api/records` | `CreateRowInputSchema` query `search` | `{ records, totalRecords, totalContribution, nextSerialNumber }` | records-api |
| POST | `/api/records` | `CreateRowInputSchema` | `{ record }` | records-api |
| PUT | `/api/records/:id` | `CreateRowInputSchema` | `{ record }` | records-api |
| DELETE | `/api/records/:id` | - | `{ success: true, id }` | records-api |
| GET | `/api/records/summary` | - | `{ totalRecords, totalContribution, lastSerialNumber, nextSerialNumber }` | records-api |
| POST | `/api/records/check-duplicate` | `DuplicateCheckInputSchema` | `{ isDuplicate, matchedRow }` | records-api |
| GET | `/api/v1/records` | `ListRecordsQueryDto` | `ListRecordsResponseDto` | records-api |
| POST | `/api/v1/records` | `CreateRecordRequestDto` | `RecordDto` | records-api |
| GET | `/api/v1/records/:recordId` | - | `RecordDto` | records-api |
| PATCH | `/api/v1/records/:recordId` | `UpdateRecordRequestDto` | `RecordDto` | records-api |
| DELETE | `/api/v1/records/:recordId` | - | `{ success: true }` | records-api |
| POST | `/api/v1/records/:recordId/transcript` | `GenerateTranscriptRequestDto` | `GenerateTranscriptResponseDto` | speech-integration |
| POST | `/api/v1/records/:recordId/summary` | `GenerateSummaryRequestDto` | `GenerateSummaryResponseDto` | ai-integration |
| POST | `/api/v1/exports` | `CreateExportJobRequestDto` | `CreateExportJobResponseDto` | export-pipeline |

Contract source of truth: `src/contracts/api/route-map.ts`.
