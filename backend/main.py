"""Application entry point for the real CodeSeek-RAG backend."""

from __future__ import annotations

import os
from collections.abc import Mapping
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.chat_api import create_chat_router
from backend.api.project_api import router as project_router
from backend.indexer.api import configure_indexer
from backend.indexer.embedding import SentenceTransformerEmbedding
from backend.indexer.http import create_index_router
from backend.indexer.service import ChromaIndexer
from backend.qa.adapters import (
    RealAdapterConfigurationError,
    create_clients,
)
from backend.qa.service import QAService
from backend.config.settings import Settings
from backend.parser import TextParser
from backend.repository import project_service


def create_app(
    *,
    environment: Mapping[str, str] | None = None,
    indexer: ChromaIndexer | None = None,
    qa_service: QAService | None = None,
) -> FastAPI:
    """Create the application and connect all module boundaries.

    ``indexer`` and ``qa_service`` can be injected by tests. Production uses
    the configured Chroma indexer, local embedding model, and LLM adapter.
    """

    load_dotenv()
    runtime_environment = dict(os.environ)
    if environment is not None:
        runtime_environment.update(environment)

    owns_indexer = indexer is None
    if indexer is None:
        settings = Settings.from_env(runtime_environment)
        indexer = ChromaIndexer(
            settings.chroma_persist_directory,
            SentenceTransformerEmbedding(settings.embedding_model),
        )
    configure_indexer(indexer)

    if qa_service is None:
        qa_environment = dict(runtime_environment)
        qa_environment.setdefault(
            "QA_RETRIEVER_SEARCH", "backend.indexer.api:search"
        )
        try:
            retriever, llm = create_clients(qa_environment)
            qa_service = QAService(retriever, llm)
        except RealAdapterConfigurationError as error:
            # Keep project loading and indexing available while making missing
            # real-mode configuration visible through the chat endpoint.
            qa_service = QAService(
                _UnavailableRetriever(error),
                _UnavailableLLM(error),
            )

    parser = TextParser()

    def chunk_provider(project_id: str) -> list[Any]:
        project = project_service.get(project_id)
        if project is None:
            raise KeyError(project_id)
        return parser.parse_files(project_id, project.files)

    allowed_origins = _read_origins(runtime_environment)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        yield
        if owns_indexer:
            indexer.close()

    app = FastAPI(
        title="CodeSeek-RAG API",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Accept", "Content-Type"],
    )

    app.include_router(project_router)
    app.include_router(create_index_router(indexer, chunk_provider))
    app.include_router(create_chat_router(qa_service))

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


def _read_origins(environment: Mapping[str, str]) -> list[str]:
    raw_origins = environment.get(
        "CORS_ALLOW_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173",
    )
    origins = [origin.strip().rstrip("/") for origin in raw_origins.split(",")]
    return [origin for origin in origins if origin]


class _UnavailableRetriever:
    def __init__(self, error: RealAdapterConfigurationError) -> None:
        self._error = error

    def search(self, _project_id: str, _question: str, _top_k: int):
        raise self._error


class _UnavailableLLM:
    def __init__(self, error: RealAdapterConfigurationError) -> None:
        self._error = error

    def generate(self, _prompt: str) -> str:
        raise self._error


app = create_app()
