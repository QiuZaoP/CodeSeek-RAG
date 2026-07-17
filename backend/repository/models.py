"""Public data structures shared with downstream modules."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class RepositoryFile:
    """A source file loaded from a local repository."""

    file_path: str
    file_type: str
    size: int
    content: str


@dataclass(frozen=True, slots=True)
class RepositoryScanResult:
    """The complete result of scanning one project."""

    project_id: str
    project_path: str
    files: tuple[RepositoryFile, ...]

    @property
    def file_count(self) -> int:
        return len(self.files)
