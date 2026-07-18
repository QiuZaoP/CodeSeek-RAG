# QA module integration guide

`backend.qa` turns indexed code chunks into a grounded answer and the exact
sources used for that answer. It does not access a vector store directly.

## Indexer contract

The indexer module must expose a callable using this exact signature:

```python
def search(project_id: str, question: str, top_k: int) -> list[SourceChunk]:
    ...
```

Each `SourceChunk` must contain the relative `file_path`, one-based inclusive
`start_line` and `end_line`, and the chunk `content`. Configure the callable
for real mode with an import target, for example:

```powershell
$env:QA_RETRIEVER_SEARCH = "backend.indexer.api:search"
```

## Runtime modes

`QA_MODE` defaults to `real`. Real mode requires `QA_RETRIEVER_SEARCH`,
`LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL`; missing or invalid setup raises
`RealAdapterConfigurationError` and must be surfaced as a service error.

Use mock mode only deliberately for local development or tests:

```powershell
$env:QA_MODE = "mock"
```

Mock mode is never an automatic fallback for a failed real configuration. The
production application should create clients with `create_clients(os.environ)`,
build `QAService(retriever, llm)`, and include
`create_chat_router(service)` in its FastAPI app.

## HTTP contract

`POST /api/chat` accepts `project_id`, a nonblank `question`, and optional
`top_k` (default `5`, minimum `1`). A successful response contains `answer`
and the exact `sources` used. LLM failures return `502`; real adapter setup
errors return `503`, each with a readable `detail`.

## Tests

```powershell
.\.venv\Scripts\python.exe -m pytest tests\test_qa.py -v
```
