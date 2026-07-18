# Repository module

This module scans a local project and exposes supported text files to later
parsing and indexing stages.

## Python usage

```python
from backend.repository import RepositoryScanner

result = RepositoryScanner().scan("D:/demo-project")
print(result.project_id, result.file_count)
print(result.files[0].file_path, result.files[0].content)
```

The scanner uses project-relative POSIX paths, skips known dependency/build
directories, symbolic links, unsupported extensions, binary files, and files
larger than 1 MiB by default.

## API usage

Include `backend.api.project_api.router` in the shared FastAPI application.
The endpoint is `POST /api/projects/load` with a JSON body containing
`project_path`.

## Tests

```bash
python -m pytest tests/test_repository.py
```
