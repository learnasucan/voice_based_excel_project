#!/usr/bin/env python3
"""Example entrypoint for Worker E export service."""

from __future__ import annotations

from pathlib import Path

from record_export import RecordExportService


class InMemoryRecordProvider:
    """Replace this with Worker B repository implementation."""

    def list_saved_records(self):
        return [
            {
                "serial_number": 1,
                "name_marathi": "सुरेश पाटील",
                "name_english": "Suresh Patil",
                "contribution_amount": 500,
                "place_marathi": "पुणे",
                "place_english": "Pune",
            },
            {
                "serial_number": 2,
                "name_marathi": "वैशाली कदम",
                "name_english": "Vaishali Kadam",
                "contribution_amount": 750,
                "place_marathi": "कोल्हापूर",
                "place_english": "Kolhapur",
            },
        ]


def main() -> None:
    provider = InMemoryRecordProvider()
    service = RecordExportService(provider)
    output_dir = Path("exports")
    output_dir.mkdir(parents=True, exist_ok=True)

    artifacts = service.export_all("contributions")
    for fmt, artifact in artifacts.items():
        out_path = output_dir / artifact.filename
        artifact.write_to(out_path)
        warning_text = f" Warnings: {', '.join(artifact.warnings)}" if artifact.warnings else ""
        print(
            f"{fmt.upper()}: {out_path} | rows={artifact.row_count} | "
            f"total={artifact.total_amount}.{warning_text}"
        )


if __name__ == "__main__":
    main()
