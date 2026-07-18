# Retrieval and QA Design

## Goal

Provide the module 4 retrieval and question-answering service for CodeSeek-RAG. It retrieves relevant code chunks for a project, builds grounded context with source citations, and returns an LLM-generated answer through `POST /api/chat`.

## Scope

This module owns only:

- `backend/qa/`: retrieval abstractions, context assembly, prompt construction, QA orchestration, and development/test fakes.
- `backend/api/chat_api.py`: the HTTP chat endpoint.
- `tests/test_qa.py`: unit and endpoint tests for the module.

It does not read Chroma storage files directly or change the indexer implementation. Production retrieval is integrated through the indexer's public interface.

## Modes and boundaries

`QA_MODE` has two explicit values:

- `real` is the default and production mode. It constructs adapters for the indexer and configured LLM. Missing configuration or unavailable dependencies are reported as readable API errors; the service never silently falls back to mock data.
- `mock` is only for local development and automated tests. Mock retriever and mock LLM objects are supplied through dependency injection, rather than being hidden inside production code paths.

Both modes implement the same `Retriever` and `LLMClient` protocols. `Retriever.search(project_id, question, top_k)` returns source chunks with `file_path`, `start_line`, `end_line`, and `content`; `LLMClient.generate(prompt)` returns an answer string. This keeps the future module 3 adapter and LLM provider adapter replaceable without changing the QA service.

## Request flow

1. The chat endpoint validates `project_id`, a nonempty `question`, and a positive `top_k` (default 5).
2. The QA service asks the injected retriever for at most `top_k` chunks.
3. It removes duplicate sources, preserves retrieval order, and admits chunks only until the configured total-context character limit is reached.
4. It formats each admitted source with its relative path and one-based inclusive line range, then builds a grounded Chinese prompt requiring citations and forbidding fabricated answers.
5. If no usable context remains, it returns the fixed insufficient-evidence response without calling the LLM.
6. Otherwise it asks the injected LLM client for an answer and returns that answer with the exact sources used.

## Errors and response contract

Successful responses are:

```json
{
  "answer": "...",
  "sources": [
    {
      "file_path": "src/auth/login.py",
      "start_line": 12,
      "end_line": 38,
      "content": "..."
    }
  ]
}
```

Invalid requests, unavailable real adapters, and LLM failures return FastAPI's standard `{"detail": "readable message"}` error body. A missing result set is a successful, grounded no-answer response: `未在当前代码库中找到足够依据。`

## Test strategy

Tests explicitly inject fake retriever and LLM implementations. They cover top-k forwarding, duplicate removal, source citations in prompts, total context limits, no-context handling, LLM errors, and the HTTP contract. No test requires an API key, vector database, or model download.
