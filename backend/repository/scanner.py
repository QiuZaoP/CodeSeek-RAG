"""Local repository discovery and text loading."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Collection

from .exceptions import (
    RepositoryEncodingError,
    RepositoryNotFoundError,
    RepositoryPathError,
    RepositoryPermissionError,
)
from .models import RepositoryFile, RepositoryScanResult

DEFAULT_SUPPORTED_EXTENSIONS = frozenset(
    {
        ".py",
        ".java",
        ".js",
        ".ts",
        ".vue",
        ".go",
        ".cpp",
        ".c",
        ".md",
        ".json",
        ".yaml",
    }
)

DEFAULT_IGNORED_DIRECTORIES = frozenset(
    {
        ".git",
        ".idea",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        ".vscode",
        "node_modules",
        "dist",
        "build",
        ".venv",
        "venv",
        "target",
        "__pycache__",
    }
)

DEFAULT_MAX_FILE_SIZE = 1 * 1024 * 1024
_BINARY_SAMPLE_SIZE = 8192
_COMMON_TEXT_ENCODINGS = ("utf-8-sig", "gb18030")


class RepositoryScanner:
    """Scan a project directory and return supported text files."""

    def __init__(
        self,
        *,
        supported_extensions: Collection[str] = DEFAULT_SUPPORTED_EXTENSIONS,
        ignored_directories: Collection[str] = DEFAULT_IGNORED_DIRECTORIES,
        max_file_size: int = DEFAULT_MAX_FILE_SIZE,
    ) -> None:
        if max_file_size <= 0:
            raise ValueError("max_file_size must be greater than zero")

        self.supported_extensions = frozenset(
            self._normalize_extension(extension)
            for extension in supported_extensions
        )
        self.ignored_directories = frozenset(
            directory.casefold() for directory in ignored_directories
        )
        self.max_file_size = max_file_size

    def scan(self, project_path: str | os.PathLike[str]) -> RepositoryScanResult:
        """Read all eligible files beneath *project_path*."""

        root = self._validate_project_path(project_path)
        files: list[RepositoryFile] = []

        try:
            walker = os.walk(
                root,
                topdown=True,
                followlinks=False,
                onerror=self._raise_walk_error,
            )
            for current_dir, directories, file_names in walker:
                directories[:] = sorted(
                    (
                        directory
                        for directory in directories
                        if directory.casefold() not in self.ignored_directories
                        and not (Path(current_dir) / directory).is_symlink()
                    ),
                    key=str.casefold,
                )

                for file_name in sorted(file_names, key=str.casefold):
                    absolute_path = Path(current_dir) / file_name
                    scanned_file = self._scan_file(root, absolute_path)
                    if scanned_file is not None:
                        files.append(scanned_file)
        except RepositoryPermissionError:
            raise
        except OSError as exc:
            raise RepositoryPermissionError(
                f"Unable to scan project directory '{root}': {exc}"
            ) from exc

        files.sort(key=lambda item: item.file_path.casefold())
        return RepositoryScanResult(
            project_id=root.name,
            project_path=str(root),
            files=tuple(files),
        )

    def _scan_file(self, root: Path, path: Path) -> RepositoryFile | None:
        if path.is_symlink():
            return None

        extension = path.suffix.lower()
        if extension not in self.supported_extensions:
            return None

        try:
            size = path.stat().st_size
        except PermissionError as exc:
            raise RepositoryPermissionError(
                f"Permission denied while reading file metadata: '{path}'"
            ) from exc
        except OSError as exc:
            raise RepositoryPermissionError(
                f"Unable to read file metadata for '{path}': {exc}"
            ) from exc

        if size > self.max_file_size:
            return None

        content = self._read_text_file(path)
        if content is None:
            return None

        return RepositoryFile(
            file_path=path.relative_to(root).as_posix(),
            file_type=extension,
            size=size,
            content=content,
        )

    def _read_text_file(self, path: Path) -> str | None:
        try:
            raw_content = path.read_bytes()
        except PermissionError as exc:
            raise RepositoryPermissionError(
                f"Permission denied while reading source file: '{path}'"
            ) from exc
        except OSError as exc:
            raise RepositoryPermissionError(
                f"Unable to read source file '{path}': {exc}"
            ) from exc

        if self._looks_binary(raw_content[:_BINARY_SAMPLE_SIZE]):
            return None

        for encoding in _COMMON_TEXT_ENCODINGS:
            try:
                return raw_content.decode(encoding)
            except UnicodeDecodeError:
                continue

        raise RepositoryEncodingError(
            f"Unable to decode text file '{path}'. Supported encodings are UTF-8 and GB18030."
        )

    @staticmethod
    def _looks_binary(sample: bytes) -> bool:
        if not sample:
            return False
        if b"\x00" in sample:
            return True

        allowed_controls = {8, 9, 10, 12, 13, 27}
        suspicious = sum(
            byte < 32 and byte not in allowed_controls for byte in sample
        )
        return suspicious / len(sample) > 0.30

    @staticmethod
    def _normalize_extension(extension: str) -> str:
        normalized = extension.strip().lower()
        if not normalized:
            raise ValueError("supported extensions cannot contain an empty value")
        return normalized if normalized.startswith(".") else f".{normalized}"

    @staticmethod
    def _validate_project_path(project_path: str | os.PathLike[str]) -> Path:
        if not str(project_path).strip():
            raise RepositoryPathError("Project path cannot be empty")

        path = Path(project_path).expanduser()
        try:
            resolved = path.resolve(strict=True)
        except FileNotFoundError as exc:
            raise RepositoryNotFoundError(
                f"Project path does not exist: '{path}'"
            ) from exc
        except PermissionError as exc:
            raise RepositoryPermissionError(
                f"Permission denied while accessing project path: '{path}'"
            ) from exc
        except OSError as exc:
            raise RepositoryPathError(
                f"Unable to access project path '{path}': {exc}"
            ) from exc

        if not resolved.is_dir():
            raise RepositoryPathError(
                f"Project path is not a directory: '{resolved}'"
            )
        return resolved

    @staticmethod
    def _raise_walk_error(error: OSError) -> None:
        raise RepositoryPermissionError(
            f"Unable to access directory '{error.filename}': {error}"
        ) from error


def scan_repository(
    project_path: str | os.PathLike[str],
    *,
    max_file_size: int = DEFAULT_MAX_FILE_SIZE,
) -> RepositoryScanResult:
    """Convenience function for one-off repository scans."""

    return RepositoryScanner(max_file_size=max_file_size).scan(project_path)
