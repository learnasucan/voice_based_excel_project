"""Contracts for integrating export logic with data-access layers."""

from __future__ import annotations

from typing import Any, Callable, Protocol, Sequence


class RecordProvider(Protocol):
    """Worker B-compatible data-access contract.

    Implement one of these method names to expose saved records.
    """

    def list_saved_records(self) -> Sequence[Any]:
        """Return all saved records."""


RecordSource = Callable[[], Sequence[Any]] | RecordProvider
