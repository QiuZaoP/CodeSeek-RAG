"""Public repository scanning interface."""

from .exceptions import (
    RepositoryEncodingError,
    RepositoryError,
    RepositoryNotFoundError,
    RepositoryPathError,
    RepositoryPermissionError,
)
from .models import RepositoryFile, RepositoryScanResult
from .scanner import (
    DEFAULT_IGNORED_DIRECTORIES,
    DEFAULT_MAX_FILE_SIZE,
    DEFAULT_SUPPORTED_EXTENSIONS,
    RepositoryScanner,
    scan_repository,
)
from .service import ProjectService, project_service

__all__ = [
    "DEFAULT_IGNORED_DIRECTORIES",
    "DEFAULT_MAX_FILE_SIZE",
    "DEFAULT_SUPPORTED_EXTENSIONS",
    "ProjectService",
    "RepositoryEncodingError",
    "RepositoryError",
    "RepositoryFile",
    "RepositoryNotFoundError",
    "RepositoryPathError",
    "RepositoryPermissionError",
    "RepositoryScanResult",
    "RepositoryScanner",
    "project_service",
    "scan_repository",
]
