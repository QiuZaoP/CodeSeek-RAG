from collections.abc import Iterator
from pathlib import Path
import shutil
from uuid import uuid4

import pytest


@pytest.fixture
def project_dir() -> Iterator[Path]:
    """Create a writable project directory without relying on OS temp ACLs."""

    path = Path(__file__).parent / ".tmp" / uuid4().hex
    path.mkdir(parents=True)
    try:
        yield path
    finally:
        shutil.rmtree(path, ignore_errors=True)
