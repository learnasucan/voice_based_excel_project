# Record Export Module (Worker E)

Exports saved contribution records to:

- `CSV`
- `XLSX`
- `PDF`

## Required input columns

- Serial Number
- Name (Marathi)
- Name (English)
- Contribution Amount
- Place (Marathi)
- Place (English)

## Integration contract

Use `RecordExportService` with Worker B data access:

- pass a callable returning records, or
- pass a provider object with `list_saved_records()`, `get_saved_records()`, or `fetch_saved_records()`.

Records can be dict-like or object-like. The mapper resolves common aliases.

## Download-ready output

`RecordExportService.export(fmt)` returns `ExportArtifact`:

- `filename`
- `content_type`
- `payload` (bytes for HTTP/file download)
- `row_count`
- `total_amount`
- `warnings`

## Marathi in PDF strategy

PDF exporter attempts to auto-register Devanagari fonts from common paths:

- `NotoSansDevanagari-Regular.ttf`
- `NotoSerifDevanagari-Regular.ttf`
- `Mukta-Regular.ttf`
- `Lohit-Devanagari.ttf`

If no supported font is found, a warning is returned in `ExportArtifact.warnings`.
