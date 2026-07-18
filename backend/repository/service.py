"""In-memory project registry used by API and downstream modules."""

from __future__ import annotations

from threading import RLock

from .models import RepositoryScanResult
from .scanner import RepositoryScanner


class ProjectService:
    """Load repositories and retain their file contents for later indexing."""

    def __init__(self, scanner: RepositoryScanner | None = None) -> None:
        self._scanner = scanner or RepositoryScanner()
        self._projects: dict[str, RepositoryScanResult] = {}
        self._lock = RLock()

    def load(self, project_path: str) -> RepositoryScanResult:
        result = self._scanner.scan(project_path)
        with self._lock:
            self._projects[result.project_id] = result
        return result

    def get(self, project_id: str) -> RepositoryScanResult | None:
        with self._lock:
            return self._projects.get(project_id)

    def remove(self, project_id: str) -> bool:
        with self._lock:
            return self._projects.pop(project_id, None) is not None

    def clear(self) -> None:
        with self._lock:
            self._projects.clear()


project_service = ProjectService()
