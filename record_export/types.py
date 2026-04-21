"""Core data types used by export modules."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class ExportRow:
    serial_number: int
    name_marathi: str
    name_english: str
    contribution_amount: int
    place_marathi: str
    place_english: str

    def as_list(self) -> list[int | str]:
        return [
            self.serial_number,
            self.name_marathi,
            self.name_english,
            self.contribution_amount,
            self.place_marathi,
            self.place_english,
        ]


@dataclass(frozen=True)
class ExportPayload:
    data: bytes
    total_amount: int
    warnings: tuple[str, ...] = ()


@dataclass(frozen=True)
class ExportArtifact:
    filename: str
    content_type: str
    payload: bytes
    row_count: int
    total_amount: int
    warnings: tuple[str, ...] = field(default_factory=tuple)

    def write_to(self, file_path: Path) -> Path:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(self.payload)
        return file_path
