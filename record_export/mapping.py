"""Record mapping utilities.

Converts Worker A records (object or dict style) into export-ready rows.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Mapping, Sequence

from .types import ExportRow

DEVANAGARI_TO_ASCII = str.maketrans("०१२३४५६७८९", "0123456789")

SERIAL_ALIASES = (
    "serial_number",
    "serial_no",
    "serial",
    "sr_no",
    "sr",
    "index",
    "id",
)
NAME_MARATHI_ALIASES = ("name_marathi", "name_mr", "marathi_name")
NAME_ENGLISH_ALIASES = ("name_english", "name_en", "english_name")
AMOUNT_ALIASES = ("contribution_amount", "amount", "contribution", "donation_amount")
PLACE_MARATHI_ALIASES = ("place_marathi", "place_mr", "marathi_place")
PLACE_ENGLISH_ALIASES = ("place_english", "place_en", "english_place")


def _normalize_string(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _normalize_amount(value: Any) -> int:
    if value is None or value == "":
        return 0
    if isinstance(value, bool):
        raise ValueError("Boolean values are not valid contribution amounts")
    if isinstance(value, (int, float, Decimal)):
        return int(value)

    text = str(value).strip().translate(DEVANAGARI_TO_ASCII)
    cleaned = text.replace(",", "")
    if cleaned == "":
        return 0
    return int(float(cleaned))


def _read_value(record: Any, aliases: Sequence[str]) -> Any:
    if isinstance(record, Mapping):
        for alias in aliases:
            if alias in record:
                return record[alias]

    for alias in aliases:
        if hasattr(record, alias):
            return getattr(record, alias)
    return None


def map_records(records: Sequence[Any]) -> list[ExportRow]:
    rows: list[ExportRow] = []
    for idx, record in enumerate(records, start=1):
        serial_value = _read_value(record, SERIAL_ALIASES)
        serial_number = int(serial_value) if serial_value not in (None, "") else idx

        row = ExportRow(
            serial_number=serial_number,
            name_marathi=_normalize_string(_read_value(record, NAME_MARATHI_ALIASES)),
            name_english=_normalize_string(_read_value(record, NAME_ENGLISH_ALIASES)),
            contribution_amount=_normalize_amount(_read_value(record, AMOUNT_ALIASES)),
            place_marathi=_normalize_string(_read_value(record, PLACE_MARATHI_ALIASES)),
            place_english=_normalize_string(_read_value(record, PLACE_ENGLISH_ALIASES)),
        )
        rows.append(row)
    return rows
