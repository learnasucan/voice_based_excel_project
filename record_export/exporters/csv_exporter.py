"""CSV exporter."""

from __future__ import annotations

import csv
from io import StringIO
from typing import Sequence

from ..constants import EXPORT_HEADERS
from ..types import ExportPayload, ExportRow
from .base import build_total_row, compute_total


class CSVRecordExporter:
    content_type = "text/csv; charset=utf-8"
    extension = "csv"

    def export(self, rows: Sequence[ExportRow]) -> ExportPayload:
        output = StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(EXPORT_HEADERS)
        for row in rows:
            writer.writerow(row.as_list())

        total = compute_total(rows)
        writer.writerow(build_total_row(total))
        csv_data = output.getvalue().encode("utf-8-sig")
        return ExportPayload(data=csv_data, total_amount=total)
