from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class SourceChunk:
    """A retrieved code fragment and its source location."""

    file_path: str
    start_line: int
    end_line: int
    content: str


@dataclass(frozen=True)
class QAResult:
    answer: str
    sources: list[SourceChunk]


class Retriever(Protocol):
    def search(self, project_id: str, question: str, top_k: int) -> list[SourceChunk]: ...


class LLMClient(Protocol):
    def generate(self, prompt: str) -> str: ...
