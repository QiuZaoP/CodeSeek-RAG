"""Chroma-backed local vector index management."""

from __future__ import annotations

from hashlib import sha256
from pathlib import Path
from time import perf_counter
from typing import Any
from uuid import uuid4

from .embedding import EmbeddingProvider
from .models import (
    IndexBuildResult,
    IndexStatus,
    RetrievedChunk,
    normalize_chunks,
)


class ChromaIndexer:
    """Builds, replaces, searches, and deletes per-project Chroma indexes."""

    _FALLBACK_BATCH_SIZE = 1000

    def __init__(
        self,
        persist_directory: str | Path,
        embedding_provider: EmbeddingProvider,
        client: Any | None = None,
    ) -> None:
        self._persist_directory = Path(persist_directory).expanduser().resolve()
        self._embedding_provider = embedding_provider
        if client is None:
            try:
                import chromadb
            except ImportError as error:
                raise RuntimeError(
                    "chromadb is required for vector indexing; install project requirements"
                ) from error
            self._persist_directory.mkdir(parents=True, exist_ok=True)
            client = chromadb.PersistentClient(path=str(self._persist_directory))
        self._client = client
        self._closed = False

    def build(self, project_id: str, chunks: list[Any]) -> IndexBuildResult:
        self._ensure_open()
        started_at = perf_counter()
        project_id = self._validated_project_id(project_id)
        normalized = normalize_chunks(project_id, chunks)
        texts = [chunk.content for chunk in normalized]
        embeddings = self._embedding_provider.embed_documents(texts)
        self._validate_embeddings(embeddings, len(normalized))

        collection_name = self._collection_name(project_id)
        staging_name = self._temporary_collection_name(collection_name, "staging")
        staging = self._client.create_collection(
            name=staging_name,
            metadata={"project_id": project_id, "hnsw:space": "cosine"},
        )
        try:
            self._add_in_batches(staging, normalized, texts, embeddings)
            self._swap_collections(collection_name, staging_name)
        except Exception:
            self._delete_collection(staging_name)
            raise

        return IndexBuildResult(
            project_id=project_id,
            status="completed",
            chunk_count=len(normalized),
            elapsed_ms=max(0, round((perf_counter() - started_at) * 1000)),
        )

    def delete(self, project_id: str) -> bool:
        self._ensure_open()
        project_id = self._validated_project_id(project_id)
        collection_name = self._collection_name(project_id)
        if self._get_collection(collection_name) is None:
            return False
        self._client.delete_collection(collection_name)
        return True

    def status(self, project_id: str) -> IndexStatus:
        self._ensure_open()
        project_id = self._validated_project_id(project_id)
        collection = self._get_collection(self._collection_name(project_id))
        if collection is None:
            return IndexStatus(project_id=project_id, status="not_found", chunk_count=0)
        return IndexStatus(
            project_id=project_id,
            status="completed",
            chunk_count=collection.count(),
        )

    def search(self, project_id: str, question: str, top_k: int = 5) -> list[RetrievedChunk]:
        self._ensure_open()
        project_id = self._validated_project_id(project_id)
        if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k < 1:
            raise ValueError("top_k must be a positive integer")
        if not isinstance(question, str) or not question.strip():
            raise ValueError("question must not be blank")

        collection = self._get_collection(self._collection_name(project_id))
        if collection is None or collection.count() == 0:
            return []

        query_embedding = self._embedding_provider.embed_query(question)
        self._validate_embeddings([query_embedding], 1)
        result = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, collection.count()),
            include=["documents", "metadatas", "distances"],
        )
        ids = (result.get("ids") or [[]])[0]
        documents = (result.get("documents") or [[]])[0]
        metadatas = (result.get("metadatas") or [[]])[0]
        distances = (result.get("distances") or [[]])[0]

        retrieved: list[RetrievedChunk] = []
        for index, chunk_id in enumerate(ids):
            metadata = metadatas[index] or {}
            distance = distances[index] if index < len(distances) else None
            retrieved.append(
                RetrievedChunk(
                    chunk_id=chunk_id,
                    file_path=str(metadata["file_path"]),
                    start_line=int(metadata["start_line"]),
                    end_line=int(metadata["end_line"]),
                    content=documents[index],
                    score=None if distance is None else 1.0 - float(distance),
                )
            )
        return retrieved

    def close(self) -> None:
        """Release the underlying Chroma client and its file handles.

        Chroma's persistent client keeps SQLite handles open on Windows. The
        explicit method is idempotent so applications can safely call it from
        shutdown hooks, and the context-manager methods make that lifecycle
        explicit in tests and short-lived jobs.
        """

        if self._closed:
            return
        try:
            close = getattr(self._client, "close", None)
            if callable(close):
                close()
        finally:
            self._closed = True

    def __enter__(self) -> "ChromaIndexer":
        self._ensure_open()
        return self

    def __exit__(self, _exc_type, _exc_value, _traceback) -> None:
        self.close()

    @staticmethod
    def _collection_name(project_id: str) -> str:
        digest = sha256(project_id.encode("utf-8")).hexdigest()[:32]
        return f"project_{digest}"

    @staticmethod
    def _temporary_collection_name(collection_name: str, purpose: str) -> str:
        suffix = f"_{purpose}_{uuid4().hex[:8]}"
        return f"{collection_name[:63 - len(suffix)]}{suffix}"

    @staticmethod
    def _validated_project_id(project_id: str) -> str:
        if not isinstance(project_id, str) or not project_id.strip():
            raise ValueError("project_id must not be blank")
        return project_id.strip()

    @staticmethod
    def _validate_embeddings(embeddings: list[list[float]], expected_count: int) -> None:
        if len(embeddings) != expected_count:
            raise ValueError(
                f"embedding provider returned {len(embeddings)} vectors for "
                f"{expected_count} texts"
            )
        if not embeddings:
            return
        dimension = len(embeddings[0])
        if dimension == 0 or any(len(vector) != dimension for vector in embeddings):
            raise ValueError("embedding provider returned empty or inconsistent vectors")
        if any(not isinstance(value, (int, float)) for vector in embeddings for value in vector):
            raise ValueError("embedding vectors must contain only numbers")

    def _add_in_batches(
        self,
        collection: Any,
        chunks: list[Any],
        texts: list[str],
        embeddings: list[list[float]],
    ) -> None:
        if not chunks:
            return
        batch_size = self._max_batch_size()
        for start in range(0, len(chunks), batch_size):
            end = start + batch_size
            batch_chunks = chunks[start:end]
            collection.add(
                ids=[chunk.chunk_id for chunk in batch_chunks],
                documents=texts[start:end],
                embeddings=embeddings[start:end],
                metadatas=[
                    {
                        "project_id": chunk.project_id,
                        "file_path": chunk.file_path,
                        "start_line": chunk.start_line,
                        "end_line": chunk.end_line,
                    }
                    for chunk in batch_chunks
                ],
            )

    def _max_batch_size(self) -> int:
        get_max_batch_size = getattr(self._client, "get_max_batch_size", None)
        if callable(get_max_batch_size):
            try:
                value = int(get_max_batch_size())
                if value > 0:
                    return value
            except (TypeError, ValueError, RuntimeError):
                pass
        return self._FALLBACK_BATCH_SIZE

    def _swap_collections(self, collection_name: str, staging_name: str) -> None:
        """Promote a fully populated staging collection with rollback support."""

        existing = self._get_collection(collection_name)
        backup_name = self._temporary_collection_name(collection_name, "backup")
        old_was_renamed = False
        try:
            if existing is not None:
                existing.modify(name=backup_name)
                old_was_renamed = True
            staging = self._get_collection(staging_name)
            if staging is None:
                raise RuntimeError("staging collection disappeared before promotion")
            staging.modify(name=collection_name)
        except Exception:
            if old_was_renamed and self._get_collection(collection_name) is None:
                backup = self._get_collection(backup_name)
                if backup is not None:
                    backup.modify(name=collection_name)
            raise

        if old_was_renamed:
            # Promotion has completed; a stale backup is not allowed to make a
            # successful build fail, but it is cleaned up whenever Chroma allows it.
            try:
                self._delete_collection(backup_name)
            except Exception:
                pass

    def _ensure_open(self) -> None:
        if self._closed:
            raise RuntimeError("ChromaIndexer is closed")

    def _get_collection(self, collection_name: str):
        try:
            return self._client.get_collection(collection_name)
        except Exception as error:
            if error.__class__.__name__ in {
                "InvalidCollectionException",
                "NotFoundError",
            }:
                return None
            raise

    def _delete_collection(self, collection_name: str) -> None:
        if self._get_collection(collection_name) is not None:
            self._client.delete_collection(collection_name)
