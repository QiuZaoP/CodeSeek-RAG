"""Public module-three API used by parser, QA, and application wiring."""

from __future__ import annotations

from threading import Lock
from typing import Any

from backend.config.settings import Settings

from .embedding import SentenceTransformerEmbedding
from .models import IndexBuildResult, IndexStatus, RetrievedChunk
from .service import ChromaIndexer


_default_indexer: ChromaIndexer | None = None
_indexer_lock = Lock()


def configure_indexer(indexer: ChromaIndexer) -> None:
    """Replace the process-wide indexer, primarily for app wiring and tests."""

    global _default_indexer
    with _indexer_lock:
        previous = _default_indexer
        _default_indexer = indexer
    if previous is not None and previous is not indexer:
        previous.close()


def build(project_id: str, chunks: list[Any]) -> IndexBuildResult:
    return _get_indexer().build(project_id, chunks)


def delete(project_id: str) -> bool:
    return _get_indexer().delete(project_id)


def status(project_id: str) -> IndexStatus:
    return _get_indexer().status(project_id)


def search(project_id: str, question: str, top_k: int = 5) -> list[RetrievedChunk]:
    """Search callable expected by module four's real retrieval adapter."""

    return _get_indexer().search(project_id, question, top_k)


def close() -> None:
    """Close and clear the lazily created process-wide indexer."""

    global _default_indexer
    with _indexer_lock:
        indexer = _default_indexer
        _default_indexer = None
    if indexer is not None:
        indexer.close()


def _get_indexer() -> ChromaIndexer:
    global _default_indexer
    if _default_indexer is None:
        with _indexer_lock:
            if _default_indexer is None:
                settings = Settings.from_env()
                _default_indexer = ChromaIndexer(
                    settings.chroma_persist_directory,
                    SentenceTransformerEmbedding(settings.embedding_model),
                )
    return _default_indexer
