from __future__ import annotations

import asyncio
from math import sqrt

import httpx
import pytest
from fastapi import FastAPI

from backend.indexer import api
from backend.indexer.http import create_index_router
from backend.indexer.service import ChromaIndexer


class MockEmbedding:
    """Small deterministic embedding with no API or model dependency."""

    terms = ("database", "login", "python")

    @classmethod
    def _vector(cls, text: str) -> list[float]:
        lowered = text.lower()
        values = [float(lowered.count(term)) for term in cls.terms] + [1.0]
        magnitude = sqrt(sum(value * value for value in values))
        return [value / magnitude for value in values]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._vector(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._vector(text)


def chunk(
    chunk_id: str,
    content: str,
    *,
    project_id: str = "demo-project",
    file_path: str = "src/main.py",
    start_line: int = 1,
    end_line: int = 10,
) -> dict[str, object]:
    return {
        "chunk_id": chunk_id,
        "project_id": project_id,
        "file_path": file_path,
        "start_line": start_line,
        "end_line": end_line,
        "content": content,
    }


@pytest.fixture
def indexer(tmp_path) -> ChromaIndexer:
    pytest.importorskip("chromadb")
    return ChromaIndexer(tmp_path / "chroma", MockEmbedding())


def test_build_persists_chunks_and_reports_status(indexer: ChromaIndexer):
    result = indexer.build(
        "demo-project",
        [chunk("chunk-1", "Python application entry"), chunk("chunk-2", "database client")],
    )

    assert result.project_id == "demo-project"
    assert result.status == "completed"
    assert result.chunk_count == 2
    assert result.elapsed_ms >= 0
    assert indexer.status("demo-project").to_dict() == {
        "project_id": "demo-project",
        "status": "completed",
        "chunk_count": 2,
    }


def test_rebuild_replaces_old_project_chunks_without_duplicates(indexer: ChromaIndexer):
    indexer.build(
        "demo-project",
        [chunk("old-1", "login handler"), chunk("old-2", "database setup")],
    )

    result = indexer.build(
        "demo-project",
        [chunk("new-1", "Python command entry", file_path="app.py")],
    )

    assert result.chunk_count == 1
    assert indexer.status("demo-project").chunk_count == 1
    matches = indexer.search("demo-project", "login", top_k=5)
    assert [match.chunk_id for match in matches] == ["new-1"]


def test_search_returns_ranked_content_and_source_metadata(indexer: ChromaIndexer):
    indexer.build(
        "demo-project",
        [
            chunk("entry", "Python application entry", file_path="app.py", end_line=3),
            chunk(
                "database",
                "database database connection factory",
                file_path="src/db.py",
                start_line=12,
                end_line=28,
            ),
        ],
    )

    matches = indexer.search("demo-project", "database connection", top_k=1)

    assert len(matches) == 1
    assert matches[0].chunk_id == "database"
    assert matches[0].file_path == "src/db.py"
    assert (matches[0].start_line, matches[0].end_line) == (12, 28)
    assert matches[0].content == "database database connection factory"
    assert matches[0].score is not None


def test_build_preserves_source_content_whitespace(indexer: ChromaIndexer):
    source = "    def connect():\n        return client\n"
    indexer.build("demo-project", [chunk("indented", source)])

    matches = indexer.search("demo-project", "database", top_k=1)

    assert matches[0].content == source


def test_persistent_index_can_be_reopened(tmp_path):
    pytest.importorskip("chromadb")
    directory = tmp_path / "chroma"
    ChromaIndexer(directory, MockEmbedding()).build(
        "demo-project", [chunk("persisted", "database connection")]
    )

    reopened = ChromaIndexer(directory, MockEmbedding())

    assert reopened.status("demo-project").chunk_count == 1
    assert reopened.search("demo-project", "database", 1)[0].chunk_id == "persisted"


def test_delete_is_idempotent_and_status_becomes_not_found(indexer: ChromaIndexer):
    indexer.build("demo-project", [chunk("chunk-1", "login flow")])

    assert indexer.delete("demo-project") is True
    assert indexer.delete("demo-project") is False
    assert indexer.status("demo-project").status == "not_found"
    assert indexer.search("demo-project", "login", top_k=1) == []


@pytest.mark.parametrize(
    ("invalid_chunk", "message"),
    [
        (chunk("x", "content", project_id="other"), "must equal requested project_id"),
        (chunk("x", "content", file_path="C:\\secret.py"), "must be relative"),
        (chunk("x", "content", file_path="src/../../secret.py"), "must not escape"),
        (chunk("x", "content", start_line=5, end_line=4), "end_line"),
    ],
)
def test_build_rejects_invalid_chunk_metadata(
    indexer: ChromaIndexer, invalid_chunk: dict[str, object], message: str
):
    with pytest.raises(ValueError, match=message):
        indexer.build("demo-project", [invalid_chunk])


def test_public_search_callable_matches_module_four_contract(indexer: ChromaIndexer):
    indexer.build("demo-project", [chunk("db", "database connection", file_path="db.py")])
    api.configure_indexer(indexer)

    matches = api.search("demo-project", "database", 1)

    assert [(item.file_path, item.start_line, item.end_line, item.content) for item in matches] == [
        ("db.py", 1, 10, "database connection")
    ]


def test_public_api_close_releases_configured_indexer(indexer: ChromaIndexer):
    api.configure_indexer(indexer)

    api.close()
    api.close()

    with pytest.raises(RuntimeError, match="closed"):
        indexer.status("demo-project")


def test_http_build_and_status_use_injected_project_chunks(indexer: ChromaIndexer):
    chunks_by_project = {"demo-project": [chunk("chunk-1", "login handler")]}
    app = FastAPI()
    app.include_router(create_index_router(indexer, chunks_by_project.__getitem__))

    response = request(app, "POST", "/api/index/build", json={"project_id": "demo-project"})
    status_response = request(
        app, "GET", "/api/index/status", params={"project_id": "demo-project"}
    )

    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert response.json()["chunk_count"] == 1
    assert status_response.json() == {
        "project_id": "demo-project",
        "status": "completed",
        "chunk_count": 1,
    }


def test_http_build_returns_readable_error_for_unknown_project(indexer: ChromaIndexer):
    app = FastAPI()
    app.include_router(create_index_router(indexer, {}.__getitem__))

    response = request(app, "POST", "/api/index/build", json={"project_id": "missing"})

    assert response.status_code == 404
    assert response.json() == {"detail": "Project chunks were not found: missing"}


def request(app: FastAPI, method: str, url: str, **kwargs) -> httpx.Response:
    async def send() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        ) as client:
            return await client.request(method, url, **kwargs)

    return asyncio.run(send())
