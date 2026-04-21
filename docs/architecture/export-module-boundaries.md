# Export Module Boundaries

## Public boundary

- Input contract: `CreateExportJobRequestDto`
- Output contract: `CreateExportJobResponseDto`, `ExportJobDto`
- Service boundary: `ExportService`

All of the above are defined in `src/contracts/*` and consumed by API/UI workers.

## Internal boundary (reserved for export worker)

- File generation strategy (txt/json/pdf/docx)
- Storage provider details and file streaming
- Retry/error policy
- Background queue worker implementation

These internals must stay under `src/modules/export/**` and should not leak provider-specific types into route handlers.

## Route ownership

- `POST /api/v1/exports` accepts only contract DTOs and delegates to `ExportService`.
- Route files must not embed format-specific rendering logic.
