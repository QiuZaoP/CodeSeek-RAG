"""Project loading HTTP endpoint."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.repository import (
    RepositoryEncodingError,
    RepositoryNotFoundError,
    RepositoryPathError,
    RepositoryPermissionError,
    project_service,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectLoadRequest(BaseModel):
    project_path: str = Field(min_length=1)


class ProjectFileResponse(BaseModel):
    file_path: str
    file_type: str
    size: int


class ProjectLoadResponse(BaseModel):
    project_id: str
    project_path: str
    file_count: int
    files: list[ProjectFileResponse]


@router.post(
    "/load",
    response_model=ProjectLoadResponse,
    status_code=status.HTTP_200_OK,
)
def load_project(request: ProjectLoadRequest) -> ProjectLoadResponse:
    """Scan and register a local project."""

    try:
        result = project_service.load(request.project_path)
    except RepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except RepositoryPermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except (RepositoryPathError, RepositoryEncodingError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    return ProjectLoadResponse(
        project_id=result.project_id,
        project_path=result.project_path,
        file_count=result.file_count,
        files=[
            ProjectFileResponse(
                file_path=file.file_path,
                file_type=file.file_type,
                size=file.size,
            )
            for file in result.files
        ],
    )
