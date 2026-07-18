from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess
import sys

from backend.indexer.service import ChromaIndexer
from tests.test_indexer_adversarial import ToggleEmbedding, chunk


def test_multiple_projects_remain_isolated_after_repeated_rebuilds(tmp_path):
    with ChromaIndexer(tmp_path / "chroma", ToggleEmbedding()) as service:
        project_one = [
            chunk(
                content=f"database project one {position}",
                chunk_id=f"one-{position}",
                project_id="project-one",
                file_path=f"one/{position}.py",
            )
            for position in range(600)
        ]
        project_two = [
            chunk(
                content=f"database project two {position}",
                chunk_id=f"two-{position}",
                project_id="project-two",
                file_path=f"two/{position}.py",
            )
            for position in range(600)
        ]
        service.build("project-one", project_one)
        service.build("project-two", project_two)

        matches = service.search("project-one", "database", top_k=20)
        assert matches
        assert all(item.file_path.startswith("one/") for item in matches)

        for round_number in range(5):
            replacement = [
                chunk(
                    content=f"database replacement {round_number}",
                    chunk_id=f"replacement-{round_number}",
                    project_id="project-one",
                    file_path=f"replacement/{round_number}.py",
                )
            ]
            service.build("project-one", replacement)

        assert service.status("project-one").chunk_count == 1
        assert service.status("project-two").chunk_count == 600
        assert service.search("project-one", "database", 1)[0].file_path.startswith(
            "replacement/"
        )
        names = [collection.name for collection in service._client.list_collections()]
        assert all("_staging_" not in name and "_backup_" not in name for name in names)


def test_concurrent_queries_return_consistent_shapes(tmp_path):
    with ChromaIndexer(tmp_path / "chroma", ToggleEmbedding()) as service:
        service.build(
            "demo",
            [
                chunk(
                    content=f"database concurrent {position}",
                    chunk_id=f"concurrent-{position}",
                    file_path=f"concurrent/{position}.py",
                )
                for position in range(100)
            ],
        )

        with ThreadPoolExecutor(max_workers=8) as executor:
            results = list(
                executor.map(lambda _index: service.search("demo", "database", 5), range(50))
            )

        assert len(results) == 50
        assert all(len(items) == 5 for items in results)
        assert all(item.file_path.startswith("concurrent/") for items in results for item in items)


def test_index_survives_a_real_process_restart(tmp_path):
    directory = Path(tmp_path) / "restart-chroma"
    directory_literal = repr(str(directory))
    build_code = (
        "from backend.indexer.service import ChromaIndexer; "
        "from tests.test_indexer_adversarial import ToggleEmbedding, chunk; "
        f"service=ChromaIndexer({directory_literal}, ToggleEmbedding()); "
        "service.build('restart', [chunk(content='database persisted', project_id='restart')]); "
        "service.close()"
    )
    build_process = subprocess.run(
        [sys.executable, "-c", build_code],
        cwd=Path.cwd(),
        check=False,
        capture_output=True,
        text=True,
    )
    assert build_process.returncode == 0, build_process.stderr

    read_code = (
        "from backend.indexer.service import ChromaIndexer; "
        "from tests.test_indexer_adversarial import ToggleEmbedding; "
        f"service=ChromaIndexer({directory_literal}, ToggleEmbedding()); "
        "print(service.status('restart').chunk_count); "
        "print(service.search('restart', 'database', 1)[0].content); "
        "service.close()"
    )
    read_process = subprocess.run(
        [sys.executable, "-c", read_code],
        cwd=Path.cwd(),
        check=False,
        capture_output=True,
        text=True,
    )
    assert read_process.returncode == 0, read_process.stderr
    assert read_process.stdout.splitlines() == ["1", "database persisted"]


def test_concurrent_rebuilds_of_one_project_are_serializable(tmp_path):
    with ChromaIndexer(tmp_path / "chroma", ToggleEmbedding()) as service:
        def rebuild(round_number: int):
            return service.build(
                "same-project",
                [
                    chunk(
                        content=f"database round {round_number}",
                        chunk_id=f"round-{round_number}",
                        project_id="same-project",
                        file_path=f"round/{round_number}.py",
                    )
                ],
            )

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(rebuild, range(2)))

        assert [result.status for result in results] == ["completed", "completed"]
        assert service.status("same-project").chunk_count == 1
