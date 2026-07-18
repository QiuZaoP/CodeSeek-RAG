import re
from pathlib import PurePosixPath
from typing import Any, Dict, Iterable, List, Mapping, Sequence, Tuple

from backend.models.chunk import Chunk


SUPPORTED_EXTENSIONS = {
    ".c",
    ".cpp",
    ".go",
    ".java",
    ".js",
    ".json",
    ".md",
    ".py",
    ".ts",
    ".vue",
    ".yaml",
    ".yml",
}

_MARKDOWN_HEADING = re.compile(r"^\s{0,3}#{1,6}\s+\S")


class TextParser:
    """Turn repository files into line-addressable chunks.

    Input files may be dictionaries or objects with ``file_path`` and
    ``content`` attributes. This keeps the parser independent from the
    repository scanner implementation.
    """

    def __init__(self, chunk_size: int = 50, overlap: int = 10) -> None:
        if chunk_size <= 0:
            raise ValueError("chunk_size must be greater than zero")
        if overlap < 0 or overlap >= chunk_size:
            raise ValueError("overlap must be between zero and chunk_size - 1")
        self.chunk_size = chunk_size
        self.overlap = overlap

    def parse_files(self, project_id: str, files: Iterable[Any]) -> List[Chunk]:
        chunks: List[Chunk] = []
        for file_number, file_document in enumerate(files):
            chunks.extend(self.parse_file(project_id, file_document, file_number))
        return chunks

    def parse_file(
        self, project_id: str, file_document: Any, file_number: int = 0
    ) -> List[Chunk]:
        file_path, content = self._read_file_document(file_document)
        if not content.strip():
            return []

        extension = PurePosixPath(file_path.replace("\\", "/")).suffix.lower()
        lines = content.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        if lines and lines[-1] == "":
            lines.pop()

        if not lines:
            return []

        if extension == ".md":
            spans = self._markdown_spans(lines)
        else:
            spans = self._window_spans(len(lines))

        safe_path = file_path.replace("\\", "/")
        chunks: List[Chunk] = []
        for chunk_number, (start, end) in enumerate(spans, start=1):
            text = "\n".join(lines[start:end]).strip("\n")
            if not text.strip():
                continue
            chunks.append(
                Chunk(
                    chunk_id=self._chunk_id(project_id, safe_path, file_number, chunk_number),
                    project_id=project_id,
                    file_path=safe_path,
                    start_line=start + 1,
                    end_line=end,
                    content=text,
                )
            )
        return chunks

    def _window_spans(self, line_count: int) -> List[Tuple[int, int]]:
        spans: List[Tuple[int, int]] = []
        start = 0
        while start < line_count:
            end = min(start + self.chunk_size, line_count)
            spans.append((start, end))
            if end == line_count:
                break
            start = end - self.overlap
        return spans

    def _markdown_spans(self, lines: Sequence[str]) -> List[Tuple[int, int]]:
        headings = [index for index, line in enumerate(lines) if _MARKDOWN_HEADING.match(line)]
        if not headings:
            return self._window_spans(len(lines))

        boundaries = [0] + headings[1:]
        boundaries.append(len(lines))
        spans: List[Tuple[int, int]] = []
        for start, end in zip(boundaries, boundaries[1:]):
            if end - start <= self.chunk_size:
                spans.append((start, end))
            else:
                spans.extend(self._window_spans_for_range(start, end))
        return spans

    def _window_spans_for_range(self, start: int, end: int) -> List[Tuple[int, int]]:
        spans: List[Tuple[int, int]] = []
        cursor = start
        while cursor < end:
            chunk_end = min(cursor + self.chunk_size, end)
            spans.append((cursor, chunk_end))
            if chunk_end == end:
                break
            cursor = chunk_end - self.overlap
        return spans

    @staticmethod
    def _read_file_document(file_document: Any) -> Tuple[str, str]:
        if isinstance(file_document, Mapping):
            file_path = file_document.get("file_path", file_document.get("path"))
            content = file_document.get("content", "")
        else:
            file_path = getattr(file_document, "file_path", getattr(file_document, "path", None))
            content = getattr(file_document, "content", "")

        if not isinstance(file_path, str) or not file_path.strip():
            raise ValueError("each file must provide a non-empty file_path")
        if not isinstance(content, str):
            raise TypeError("file content must be a string")
        return file_path.strip(), content

    @staticmethod
    def _chunk_id(project_id: str, file_path: str, file_number: int, chunk_number: int) -> str:
        normalized = re.sub(r"[^A-Za-z0-9_-]+", "-", file_path).strip("-")
        return f"{project_id}-{file_number}-{normalized}-{chunk_number}"
