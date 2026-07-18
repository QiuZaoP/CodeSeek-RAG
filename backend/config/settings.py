"""Runtime settings for the local vector index."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    """Indexer settings loaded from environment variables."""

    chroma_persist_directory: Path
    embedding_model: str

    @classmethod
    def from_env(cls, environment: Mapping[str, str] | None = None) -> "Settings":
        values = os.environ if environment is None else environment
        raw_directory = values.get("CHROMA_PERSIST_DIRECTORY", "data/chroma").strip()
        if not raw_directory:
            raise ValueError("CHROMA_PERSIST_DIRECTORY must not be blank")

        persist_directory = Path(raw_directory).expanduser()
        if not persist_directory.is_absolute():
            persist_directory = PROJECT_ROOT / persist_directory

        embedding_model = values.get(
            "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
        ).strip()
        if not embedding_model:
            raise ValueError("EMBEDDING_MODEL must not be blank")

        return cls(
            chroma_persist_directory=persist_directory.resolve(),
            embedding_model=embedding_model,
        )
