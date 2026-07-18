from pathlib import Path

import pytest

from backend.repository import (
    ProjectService,
    RepositoryEncodingError,
    RepositoryNotFoundError,
    RepositoryPathError,
    RepositoryScanner,
)


def test_scan_returns_supported_files_with_relative_paths(project_dir: Path) -> None:
    (project_dir / "src").mkdir()
    (project_dir / "src" / "main.py").write_bytes(b"print('hello')\n")
    (project_dir / "README.md").write_bytes(b"# Demo\n")
    (project_dir / "notes.txt").write_bytes(b"ignored\n")

    result = RepositoryScanner().scan(project_dir)

    assert result.project_id == project_dir.name
    assert result.project_path == str(project_dir.resolve())
    assert result.file_count == 2
    assert [file.file_path for file in result.files] == ["README.md", "src/main.py"]
    assert result.files[1].file_type == ".py"
    assert result.files[1].content == "print('hello')\n"
    assert result.files[1].size == len(b"print('hello')\n")


def test_scan_ignores_dependency_directories_binary_and_large_files(
    project_dir: Path,
) -> None:
    (project_dir / ".git").mkdir()
    (project_dir / ".git" / "config.py").write_text(
        "secret = True", encoding="utf-8"
    )
    (project_dir / "node_modules").mkdir()
    (project_dir / "node_modules" / "package.js").write_text(
        "ignored = true", encoding="utf-8"
    )
    (project_dir / "binary.json").write_bytes(b"\x00\x01\x02not text")
    (project_dir / "large.py").write_text("x" * 21, encoding="utf-8")
    (project_dir / "keep.yaml").write_text("enabled: true\n", encoding="utf-8")

    result = RepositoryScanner(max_file_size=20).scan(project_dir)

    assert [file.file_path for file in result.files] == ["keep.yaml"]


def test_scan_supports_common_chinese_text_encoding(project_dir: Path) -> None:
    content = "# 项目说明\n"
    (project_dir / "README.md").write_bytes(content.encode("gb18030"))

    result = RepositoryScanner().scan(project_dir)

    assert result.files[0].content == content


def test_scan_rejects_missing_path(project_dir: Path) -> None:
    missing_path = project_dir / "missing"

    with pytest.raises(RepositoryNotFoundError, match="does not exist"):
        RepositoryScanner().scan(missing_path)


def test_scan_rejects_a_file_as_project_path(project_dir: Path) -> None:
    file_path = project_dir / "main.py"
    file_path.write_text("print('hello')", encoding="utf-8")

    with pytest.raises(RepositoryPathError, match="not a directory"):
        RepositoryScanner().scan(file_path)


def test_scan_reports_invalid_text_encoding(project_dir: Path) -> None:
    (project_dir / "broken.py").write_bytes(b"\x81")

    with pytest.raises(RepositoryEncodingError, match="Unable to decode"):
        RepositoryScanner().scan(project_dir)


def test_service_registers_and_removes_loaded_project(project_dir: Path) -> None:
    (project_dir / "main.py").write_text("answer = 42\n", encoding="utf-8")
    service = ProjectService()

    loaded = service.load(str(project_dir))

    assert service.get(loaded.project_id) == loaded
    assert service.remove(loaded.project_id) is True
    assert service.get(loaded.project_id) is None
    assert service.remove(loaded.project_id) is False
