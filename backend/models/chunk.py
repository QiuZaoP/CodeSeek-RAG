from dataclasses import asdict, dataclass
from typing import Any, Dict


@dataclass(frozen=True)
class Chunk:
    """A text fragment with enough metadata to cite its source."""

    chunk_id: str
    project_id: str
    file_path: str
    start_line: int
    end_line: int
    content: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
