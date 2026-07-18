from __future__ import annotations

import asyncio
from dataclasses import dataclass
from math import sqrt
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI

from backend.indexer.http import create_index_router
from backend.indexer.service import ChromaIndexer


class ToggleEmbedding:
    def __init__(self) -> None:
        self.fail_documents = False

    @staticmethod
    def vector(text: str) -> list[float]:
        values = [float(text.lower().count("database")), 1.0]
        magnitude = sqrt(sum(value * value for value in values))
        return [value / magnitude for value in values]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if self.fail_documents:
            raise RuntimeError("embedding service unavailable")
        return [self.vector(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self.vector(text)


@dataclass(frozen=True)
class ChunkObject:
    chunk_id: str
    project_id: str
    file_path: str
    start_line: int
    end_line: int
    content: str


class FailingCollection:
    def __init__(self, collection) -> None:
        self._collection = collection

    def add(self, **_kwargs) -> None:
        raise RuntimeError("storage write unavailable")


class FailingPromotionCollection:
    def __init__(self, collection) -> None:
        self._collection = collection

    def modify(self, **_kwargs) -> None:
        raise RuntimeError("collection promotion unavailable")


class FailingStageClient:
    """Proxy that fails only while writing a staging collection."""

    def __init__(self, client) -> None:
        self._client = client

    def create_collection(self, **kwargs):
        collection = self._client.create_collection(**kwargs)
        if "_staging_" in kwargs["name"]:
            return FailingCollection(collection)
        return collection

    def get_collection(self, name):
        return self._client.get_collection(name)

    def delete_collection(self, name):
        return self._client.delete_collection(name)

    def get_max_batch_size(self):
        return self._client.get_max_batch_size()

    def close(self):
        return self._client.close()


class FailingPromotionClient(FailingStageClient):
    def create_collection(self, **kwargs):
        return self._client.create_collection(**kwargs)

    def get_collection(self, name):
        collection = self._client.get_collection(name)
        if "_staging_" in name:
            return FailingPromotionCollection(collection)
        return collection


def chunk(content: str = "database connection", **overrides: object) -> dict[str, object]:
    value: dict[str, object] = {
        "chunk_id": "chunk-1",
        "project_id": "demo",
        "file_path": "src/db.py",
        "start_line": 1,
        "end_line": 3,
        "content": content,
    }
    value.update(overrides)
    return value


@pytest.fixture
def indexer(tmp_path) -> tuple[ChromaIndexer, ToggleEmbedding]:
    pytest.importorskip("chromadb")
    provider = ToggleEmbedding()
    return ChromaIndexer(tmp_path / "chroma", provider), provider


def test_empty_build_replaces_existing_index_with_zero_chunks(indexer):
    service, _ = indexer
    service.build("demo", [chunk()])

    result = service.build("demo", [])

    assert result.chunk_count == 0
    assert service.status("demo").chunk_count == 0
    assert service.search("demo", "database", 1) == []


def test_whitespace_project_id_is_normalized_and_object_chunks_are_supported(indexer):
    service, _ = indexer
    source = ChunkObject(
        chunk_id="object-1",
        project_id="demo",
        file_path="src/db.py",
        start_line=2,
        end_line=4,
        content="database object chunk",
    )

    result = service.build("  demo  ", [source])

    assert result.project_id == "demo"
    assert service.status("demo").chunk_count == 1
    assert service.search("demo", "database", 1)[0].chunk_id == "object-1"


@pytest.mark.parametrize(
    "top_k",
    [0, -1, True, 1.5, "1"],
)
def test_search_rejects_invalid_top_k(indexer, top_k):
    service, _ = indexer
    service.build("demo", [chunk()])

    with pytest.raises(ValueError, match="top_k"):
        service.search("demo", "database", top_k)


def test_embedding_failure_does_not_delete_previous_index(indexer):
    service, provider = indexer
    service.build("demo", [chunk(content="database original")])
    provider.fail_documents = True

    with pytest.raises(RuntimeError, match="unavailable"):
        service.build("demo", [chunk(content="database replacement")])

    assert service.status("demo").chunk_count == 1
    assert service.search("demo", "database", 1)[0].content == "database original"


def test_invalid_embedding_shape_is_rejected_before_collection_replacement(indexer):
    service, provider = indexer
    service.build("demo", [chunk()])

    class WrongShape:
        def embed_documents(self, texts):
            return [[1.0], [2.0]]

        def embed_query(self, text):
            return [1.0, 0.0]

    service._embedding_provider = WrongShape()
    with pytest.raises(ValueError, match="vectors"):
        service.build("demo", [chunk()])

    assert service.status("demo").chunk_count == 1
    assert provider is not service._embedding_provider


def test_http_validation_covers_missing_and_blank_project_id(indexer):
    service, _ = indexer
    app = FastAPI()
    app.include_router(create_index_router(service, lambda _project: [chunk()]))

    missing = request(app, "POST", "/api/index/build", json={})
    blank = request(app, "POST", "/api/index/build", json={"project_id": "   "})
    blank_status = request(app, "GET", "/api/index/status", params={"project_id": "   "})

    assert missing.status_code == 422
    assert blank.status_code == 422
    assert blank_status.status_code == 422


def test_duplicate_chunk_ids_are_rejected(indexer):
    service, _ = indexer
    with pytest.raises(ValueError, match="duplicate chunk_id"):
        service.build(
            "demo",
            [chunk(), chunk(chunk_id="chunk-1", file_path="src/other.py")],
        )


def test_large_build_is_batched_beyond_chroma_single_call_limit(indexer):
    service, _ = indexer
    chunks = [
        chunk(
            content=f"database chunk {position}",
            chunk_id=f"chunk-{position}",
            file_path=f"src/{position}.py",
        )
        for position in range(5500)
    ]

    result = service.build("demo", chunks)

    assert result.chunk_count == 5500
    assert service.status("demo").chunk_count == 5500


def test_failed_staging_write_preserves_previous_index(indexer):
    service, _ = indexer
    service.build("demo", [chunk(content="database original")])
    real_client = service._client
    service._client = FailingStageClient(real_client)

    with pytest.raises(RuntimeError, match="storage write unavailable"):
        service.build("demo", [chunk(content="database replacement")])

    assert service.status("demo").chunk_count == 1
    assert service.search("demo", "database", 1)[0].content == "database original"


def test_failed_promotion_rolls_back_backup_collection(indexer):
    service, _ = indexer
    service.build("demo", [chunk(content="database original")])
    real_client = service._client
    service._client = FailingPromotionClient(real_client)

    with pytest.raises(RuntimeError, match="promotion unavailable"):
        service.build("demo", [chunk(content="database replacement")])

    assert service.status("demo").chunk_count == 1
    assert service.search("demo", "database", 1)[0].content == "database original"


def test_context_manager_closes_client_and_allows_reopen(tmp_path):
    directory = Path(tmp_path) / "chroma"
    with ChromaIndexer(directory, ToggleEmbedding()) as service:
        service.build("demo", [chunk()])

    with pytest.raises(RuntimeError, match="closed"):
        service.status("demo")

    reopened = ChromaIndexer(directory, ToggleEmbedding())
    try:
        assert reopened.status("demo").chunk_count == 1
    finally:
        reopened.close()


def test_successful_swap_leaves_no_staging_or_backup_collections(indexer):
    service, _ = indexer
    service.build("demo", [chunk()])
    service.build("demo", [chunk(chunk_id="new", content="database replacement")])

    names = [collection.name for collection in service._client.list_collections()]
    assert all("_staging_" not in name and "_backup_" not in name for name in names)


def request(app: FastAPI, method: str, url: str, **kwargs) -> httpx.Response:
    async def send() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            return await client.request(method, url, **kwargs)

    return asyncio.run(send())
