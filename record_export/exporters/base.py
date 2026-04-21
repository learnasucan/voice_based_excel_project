"""Shared helpers for exporter implementations."""

from __future__ import annotations

from typing import Sequence

from ..constants import TOTAL_LABEL
from ..types import ExportRow


def compute_total(rows: Sequence[ExportRow]) -> int:
    return sum(row.contribution_amount for row in rows)


def build_total_row(total: int) -> list[int | str]:
    return [TOTAL_LABEL, "", "", total, "", ""]
