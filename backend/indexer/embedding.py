"""Embedding provider abstractions used by the indexer."""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class EmbeddingProvider(Protocol):
    """Converts document and query text into vectors of equal dimension."""

    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    def embed_query(self, text: str) -> list[float]: ...


class SentenceTransformerEmbedding:
    """Lazy local embedding provider backed by ``sentence-transformers``.

    Model loading is delayed until the first embedding call. Importing the
    indexer therefore never downloads a model or requires network access.
    """

    def __init__(self, model_name: str) -> None:
        if not model_name.strip():
            raise ValueError("model_name must not be blank")
        self._model_name = model_name
        self._model = None

    def _get_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as error:
                raise RuntimeError(
                    "sentence-transformers is required for real embeddings; "
                    "install project requirements or inject a mock embedding provider"
                ) from error
            try:
                self._model = SentenceTransformer(self._model_name)
            except Exception as error:
                raise RuntimeError(
                    f"Failed to load embedding model '{self._model_name}': {error}"
                ) from error
        return self._model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        try:
            vectors = self._get_model().encode(
                texts, normalize_embeddings=True, show_progress_bar=False
            )
        except Exception as error:
            if isinstance(error, RuntimeError):
                raise
            raise RuntimeError(f"Failed to embed documents: {error}") from error
        return [vector.tolist() for vector in vectors]

    def embed_query(self, text: str) -> list[float]:
        if not text.strip():
            raise ValueError("query text must not be blank")
        vectors = self.embed_documents([text])
        return vectors[0]
