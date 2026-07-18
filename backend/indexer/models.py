"""Stable data structures shared at the indexer boundary."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import asdict, dataclass
from pathlib import PurePosixPath, PureWindowsPath
from typing import Any


@dataclass(frozen=True)
class NormalizedChunk:
    chunk_id: str
    project_id: str
    file_path: str
    start_line: int
    end_line: int
    content: str


@dataclass(frozen=True)
class IndexBuildResult:
    project_id: str
    status: str
    chunk_count: int
    elapsed_ms: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class IndexStatus:
    project_id: str
    status: str
    chunk_count: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class RetrievedChunk:
    """A retrieval result compatible with module four's ``SourceChunk``."""

    file_path: str
    start_line: int
    end_line: int
    content: str
    chunk_id: str
    score: float | None = None


def normalize_chunks(project_id: str, chunks: list[Any]) -> list[NormalizedChunk]:
    project_id = _nonblank_text(project_id, "project_id")
    normalized: list[NormalizedChunk] = []
    seen_ids: set[str] = set()

    for position, chunk in enumerate(chunks):
        label = f"chunks[{position}]"
        chunk_project_id = _nonblank_text(_field(chunk, "project_id", label), f"{label}.project_id")
        if chunk_project_id != project_id:
            raise ValueError(
                f"{label}.project_id must equal requested project_id '{project_id}'"
            )

        chunk_id = _nonblank_text(_field(chunk, "chunk_id", label), f"{label}.chunk_id")
        if chunk_id in seen_ids:
            raise ValueError(f"duplicate chunk_id: {chunk_id}")
        seen_ids.add(chunk_id)

        file_path = _relative_file_path(_field(chunk, "file_path", label), f"{label}.file_path")
        start_line = _positive_integer(_field(chunk, "start_line", label), f"{label}.start_line")
        end_line = _positive_integer(_field(chunk, "end_line", label), f"{label}.end_line")
        if end_line < start_line:
            raise ValueError(f"{label}.end_line must be greater than or equal to start_line")
        content = _nonblank_content(_field(chunk, "content", label), f"{label}.content")

        normalized.append(
            NormalizedChunk(
                chunk_id=chunk_id,
                project_id=chunk_project_id,
                file_path=file_path,
                start_line=start_line,
                end_line=end_line,
                content=content,
            )
        )
    return normalized


def _field(chunk: Any, name: str, label: str) -> Any:
    if isinstance(chunk, Mapping):
        if name not in chunk:
            raise ValueError(f"{label} is missing required field '{name}'")
        return chunk[name]
    if not hasattr(chunk, name):
        raise ValueError(f"{label} is missing required field '{name}'")
    return getattr(chunk, name)


def _nonblank_text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be a nonblank string")
    return value.strip()


def _positive_integer(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError(f"{label} must be a positive integer")
    return value


def _nonblank_content(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be a nonblank string")
    return value


def _relative_file_path(value: Any, label: str) -> str:
    path = _nonblank_text(value, label).replace("\\", "/")
    if PurePosixPath(path).is_absolute() or PureWindowsPath(path).is_absolute():
        raise ValueError(f"{label} must be relative to the project root")
    parsed = PurePosixPath(path)
    if ".." in parsed.parts:
        raise ValueError(f"{label} must not escape the project root")
    return str(parsed)
