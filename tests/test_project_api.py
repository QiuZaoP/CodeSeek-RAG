from pathlib import Path

import pytest

pytest.importorskip("fastapi")

from fastapi import HTTPException
from backend.api.project_api import ProjectLoadRequest, load_project
from backend.repository import RepositoryPermissionError, project_service


def test_load_project_api_returns_metadata_but_retains_content(
    project_dir: Path,
) -> None:
    (project_dir / "main.py").write_bytes(b"answer = 42\n")
    project_service.clear()

    response = load_project(ProjectLoadRequest(project_path=str(project_dir)))

    assert response.file_count == 1
    assert response.files[0].file_path == "main.py"
    assert not hasattr(response.files[0], "content")
    registered = project_service.get(response.project_id)
    assert registered is not None
    assert registered.files[0].content == "answer = 42\n"


def test_load_project_api_maps_missing_path_to_404(project_dir: Path) -> None:
    request = ProjectLoadRequest(project_path=str(project_dir / "missing"))

    with pytest.raises(HTTPException) as error:
        load_project(request)

    assert error.value.status_code == 404
    assert "does not exist" in error.value.detail


def test_load_project_api_maps_permission_error_to_403(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def deny_access(project_path: str) -> None:
        raise RepositoryPermissionError(f"Permission denied: {project_path}")

    monkeypatch.setattr(project_service, "load", deny_access)

    with pytest.raises(HTTPException) as error:
        load_project(ProjectLoadRequest(project_path="C:/private"))

    assert error.value.status_code == 403
    assert "Permission denied" in error.value.detail
