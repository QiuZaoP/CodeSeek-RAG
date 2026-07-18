from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.main import create_app
from backend.qa.models import QAResult, SourceChunk


class FakeIndexer:
    def close(self):
        pass

    def build(self, project_id, chunks):
        return type(
            "BuildResult",
            (),
            {
                "to_dict": lambda _self: {
                    "project_id": project_id,
                    "status": "completed",
                    "chunk_count": len(chunks),
                    "elapsed_ms": 0,
                }
            },
        )()

    def status(self, project_id):
        return type(
            "StatusResult",
            (),
            {
                "to_dict": lambda _self: {
                    "project_id": project_id,
                    "status": "not_found",
                    "chunk_count": 0,
                }
            },
        )()

    def delete(self, _project_id):
        return False


class FakeQA:
    def answer(self, _project_id, _question, _top_k):
        return QAResult(
            answer="test answer",
            sources=[SourceChunk("src/main.py", 1, 2, "print('ok')")],
        )


def test_create_app_registers_health_and_rag_routes():
    app: FastAPI = create_app(indexer=FakeIndexer(), qa_service=FakeQA())
    client = TestClient(app)

    assert client.get("/health").json() == {"status": "ok"}
    paths = set(app.openapi()["paths"])
    assert {
        "/api/projects/load",
        "/api/index/build",
        "/api/index/status",
        "/api/chat",
    }.issubset(paths)


def test_create_app_adds_cors_headers():
    app = create_app(
        environment={"CORS_ALLOW_ORIGINS": "http://example.test"},
        indexer=FakeIndexer(),
        qa_service=FakeQA(),
    )
    response = TestClient(app).options(
        "/health",
        headers={
            "Origin": "http://example.test",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://example.test"
