"""Repository scanning errors with user-facing messages."""


class RepositoryError(Exception):
    """Base error for repository operations."""


class RepositoryNotFoundError(RepositoryError):
    """Raised when the requested project path does not exist."""


class RepositoryPathError(RepositoryError):
    """Raised when the requested project path is not a directory."""


class RepositoryPermissionError(RepositoryError):
    """Raised when a project path or source file cannot be read."""


class RepositoryEncodingError(RepositoryError):
    """Raised when a likely text file cannot be decoded."""
