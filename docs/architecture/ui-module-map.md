# UI Module Map

| UI Surface | Module | Data Inputs | Depends On |
| --- | --- | --- | --- |
| Record List Page | `records` | `ListRecordsResponseDto` | `GET /api/v1/records` |
| Record Detail Page | `records` | `RecordDto` | `GET /api/v1/records/:recordId` |
| Transcript Action | `speech` | `GenerateTranscriptRequestDto` | `POST /api/v1/records/:recordId/transcript` |
| Summary Action | `ai` | `GenerateSummaryRequestDto` | `POST /api/v1/records/:recordId/summary` |
| Export Action Panel | `export` | `CreateExportJobRequestDto` | `POST /api/v1/exports` |

Notes:
- Module directories under `src/modules/*` are the only place feature UI should be implemented.
- Shared DTO/domain types must be imported from `src/contracts` only.
