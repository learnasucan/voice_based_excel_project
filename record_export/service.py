"""Service orchestration for record exports."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Sequence

from .contracts import RecordSource
from .exporters import CSVRecordExporter, PDFRecordExporter, XLSXRecordExporter
from .mapping import map_records
from .types import ExportArtifact


class RecordExportService:
    """Exports saved records to CSV, XLSX, and PDF.

    Input compatibility:
    - A callable returning saved records.
    - An object exposing one of:
      - list_saved_records()
      - get_saved_records()
      - fetch_saved_records()
    """

    def __init__(self, record_source: RecordSource):
        self._record_source = record_source
        self._exporters = {
            "csv": CSVRecordExporter(),
            "xlsx": XLSXRecordExporter(),
            "pdf": PDFRecordExporter(),
        }

    def export(self, fmt: str, filename: str | None = None) -> ExportArtifact:
        records = self._load_records()
        rows = map_records(records)

        key = fmt.lower().strip()
        if key not in self._exporters:
            raise ValueError(f"Unsupported export format: {fmt}")

        exporter = self._exporters[key]
        payload = exporter.export(rows)
        output_name = filename or self._default_filename(key)
        return ExportArtifact(
            filename=output_name,
            content_type=exporter.content_type,
            payload=payload.data,
            row_count=len(rows),
            total_amount=payload.total_amount,
            warnings=payload.warnings,
        )

    def export_all(self, filename_prefix: str = "contributions") -> dict[str, ExportArtifact]:
        outputs: dict[str, ExportArtifact] = {}
        for fmt in ("csv", "xlsx", "pdf"):
            outputs[fmt] = self.export(fmt, filename=f"{filename_prefix}.{fmt}")
        return outputs

    def _load_records(self) -> Sequence[Any]:
        source = self._record_source
        if callable(source):
            return source()

        for method_name in ("list_saved_records", "get_saved_records", "fetch_saved_records"):
            if hasattr(source, method_name):
                method = getattr(source, method_name)
                if callable(method):
                    return method()

        raise TypeError(
            "record_source must be a callable or provider with list_saved_records(), "
            "get_saved_records(), or fetch_saved_records()."
        )

    @staticmethod
    def _default_filename(fmt: str) -> str:
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"contributions_{stamp}.{fmt}"
