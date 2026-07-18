"""FastAPI router factory for index build and status endpoints."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .service import ChromaIndexer


class IndexBuildRequest(BaseModel):
    project_id: str = Field(min_length=1)


def create_index_router(
    indexer: ChromaIndexer,
    chunk_provider: Callable[[str], list[Any]],
) -> APIRouter:
    """Create the HTTP API while leaving chunk ownership to application wiring."""

    router = APIRouter(prefix="/api/index", tags=["index"])

    @router.post("/build")
    def build_index(request: IndexBuildRequest) -> dict[str, Any]:
        project_id = request.project_id.strip()
        if not project_id:
            raise HTTPException(status_code=422, detail="project_id must not be blank")
        try:
            chunks = chunk_provider(project_id)
            return indexer.build(project_id, chunks).to_dict()
        except KeyError as error:
            raise HTTPException(
                status_code=404, detail=f"Project chunks were not found: {project_id}"
            ) from error
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        except Exception as error:
            raise HTTPException(
                status_code=500, detail=f"Index build failed: {error}"
            ) from error

    @router.get("/status")
    def index_status(project_id: str = Query(min_length=1)) -> dict[str, Any]:
        if not project_id.strip():
            raise HTTPException(status_code=422, detail="project_id must not be blank")
        return indexer.status(project_id).to_dict()

    @router.delete("/{project_id}")
    def delete_index(project_id: str) -> dict[str, Any]:
        deleted = indexer.delete(project_id)
        return {"project_id": project_id, "deleted": deleted}

    return router
