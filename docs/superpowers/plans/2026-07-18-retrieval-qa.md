# Retrieval and QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build module 4's isolated retrieval and question-answering service with explicit real/mock modes and a FastAPI `POST /api/chat` endpoint.

**Architecture:** The service receives protocol-compatible retriever and LLM clients, so tests inject fakes rather than relying on production fallbacks. A mode factory selects real adapters by default and mock adapters only for `QA_MODE=mock`; real setup errors remain errors. The service owns deduplication, capped context construction, prompt assembly, and returned sources.

**Tech Stack:** Python 3, FastAPI, Pydantic, pytest, OpenAI SDK.

---

## Files

- Create `backend/qa/models.py`: source/result data models and client protocols.
- Create `backend/qa/service.py`: retrieval, context, prompt, and answer orchestration.
- Create `backend/qa/adapters.py`: explicit real/mock client construction.
- Create `backend/qa/__init__.py`: public module exports.
- Create `backend/qa/README.md`: mode switch and module-3 integration contract.
- Create `backend/api/chat_api.py`: request/response schemas and route factory.
- Create `tests/test_qa.py`: unit and endpoint tests using injected fakes.

### Task 1: Define QA boundaries and core service

**Files:** `backend/qa/models.py`, `backend/qa/service.py`, `tests/test_qa.py`

- [ ] **Step 1: Write failing service tests**

```python
def test_answer_uses_top_k_deduplicated_sources_and_citations():
    retriever = FakeRetriever([
        source("a.py", 1, 2, "one"),
        source("a.py", 1, 2, "one"),
        source("b.py", 3, 4, "two"),
    ])
    llm = FakeLLM("grounded answer")
    result = QAService(retriever, llm, context_limit=100).answer("demo", "where?", top_k=2)
    assert result.answer == "grounded answer"
    assert [item.file_path for item in result.sources] == ["a.py", "b.py"]
    assert "a.py:1-2" in llm.prompts[0]

def test_answer_returns_insufficient_evidence_without_calling_llm():
    llm = FakeLLM("unused")
    result = QAService(FakeRetriever([]), llm).answer("demo", "where?")
    assert result.answer == INSUFFICIENT_EVIDENCE_MESSAGE
    assert result.sources == []
    assert llm.prompts == []
```

- [ ] **Step 2: Verify red**

Run: `pytest tests/test_qa.py -v`

Expected: import/collection failure naming `QAService` or `backend.qa.models`.

- [ ] **Step 3: Implement the minimum**

```python
@dataclass(frozen=True)
class SourceChunk:
    file_path: str
    start_line: int
    end_line: int
    content: str

class Retriever(Protocol):
    def search(self, project_id: str, question: str, top_k: int) -> list[SourceChunk]: ...

class LLMClient(Protocol):
    def generate(self, prompt: str) -> str: ...
```

`QAService.answer` forwards `top_k`, de-duplicates all source fields while preserving order, applies its character cap before adding each source, labels each source `path:start-end`, and bypasses LLM generation for no usable context.

- [ ] **Step 4: Verify green**

Run: `pytest tests/test_qa.py -v`

Expected: all service tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/qa/models.py backend/qa/service.py tests/test_qa.py
git commit -m "feat: add grounded QA service"
```

### Task 2: Add explicit real/mock adapter selection

**Files:** `backend/qa/adapters.py`, `tests/test_qa.py`

- [ ] **Step 1: Write failing mode tests**

```python
def test_mock_mode_constructs_mock_clients_only_when_explicitly_selected():
    retriever, llm = create_clients({"QA_MODE": "mock"})
    assert isinstance(retriever, MockRetriever)
    assert isinstance(llm, MockLLM)

def test_real_mode_is_default_and_reports_missing_real_integration():
    with pytest.raises(RealAdapterConfigurationError, match="real retrieval"):
        create_clients({})

def test_unknown_mode_is_rejected():
    with pytest.raises(ValueError, match="QA_MODE"):
        create_clients({"QA_MODE": "preview"})
```

- [ ] **Step 2: Verify red**

Run: `pytest tests/test_qa.py -k "mode" -v`

Expected: import failure naming `create_clients`.

- [ ] **Step 3: Implement the mode factory**

`create_clients(environment)` accepts only `mock` and `real`, chooses `real` when `QA_MODE` is absent, and never replaces a real-mode error with mocks. Mock clients are deterministic development objects. The real retriever wraps the indexer's public `search(project_id, question, top_k)` callable; the real LLM reads `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL`. Missing integration raises `RealAdapterConfigurationError` with actionable text.

- [ ] **Step 4: Verify green**

Run: `pytest tests/test_qa.py -k "mode" -v`

Expected: the three mode tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/qa/adapters.py tests/test_qa.py
git commit -m "feat: add explicit QA runtime modes"
```

### Task 3: Expose HTTP contract and document handoff

**Files:** `backend/api/chat_api.py`, `backend/qa/__init__.py`, `backend/qa/README.md`, `tests/test_qa.py`

- [ ] **Step 1: Write failing endpoint tests**

```python
def test_chat_endpoint_returns_answer_and_exact_sources(client):
    response = client.post("/api/chat", json={"project_id": "demo", "question": "entry?", "top_k": 1})
    assert response.status_code == 200
    assert response.json()["answer"] == "grounded answer"
    assert response.json()["sources"][0]["start_line"] == 1

def test_chat_endpoint_turns_llm_failure_into_readable_detail(client):
    response = client.post("/api/chat", json={"project_id": "demo", "question": "entry?"})
    assert response.status_code == 502
    assert "detail" in response.json()
```

- [ ] **Step 2: Verify red**

Run: `pytest tests/test_qa.py -k "endpoint" -v`

Expected: import failure naming `create_chat_router`.

- [ ] **Step 3: Implement route and README**

`create_chat_router(service)` returns an `APIRouter` with `POST /api/chat`; request validation requires a nonblank question and `top_k >= 1`. Convert LLM failures to status 502 and real-adapter setup failures to status 503, both with readable `detail` bodies. The README documents the indexer search contract, `QA_MODE=real` default, intentional mock usage, and `pytest tests/test_qa.py -v`.

- [ ] **Step 4: Verify green**

Run: `pytest tests/test_qa.py -v`

Expected: all QA tests pass without an API key, vector database, or model download.

- [ ] **Step 5: Commit and push**

```bash
git add backend/api/chat_api.py backend/qa/__init__.py backend/qa/README.md tests/test_qa.py
git commit -m "feat: expose chat API with QA integration guide"
git push origin feature/retrieval
```

### Task 4: Final verification

- [ ] **Step 1: Run full test suite**

Run: `pytest -v`

Expected: all discovered tests pass.

- [ ] **Step 2: Check scope and documentation**

Run: `git diff --check origin/main...HEAD && git log --oneline origin/main..HEAD && git status --short`

Expected: no whitespace errors; only QA/API/test/documentation changes; clean working tree.

- [ ] **Step 3: Push final branch**

Run: `git push origin feature/retrieval`

Expected: remote branch is current.
