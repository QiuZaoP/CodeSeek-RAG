import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.qa.adapters import (
    MockLLM,
    MockRetriever,
    OpenAILLM,
    RealAdapterConfigurationError,
    create_clients,
)
from backend.qa.models import SourceChunk
from backend.qa.service import INSUFFICIENT_EVIDENCE_MESSAGE, QAService
from backend.api.chat_api import create_chat_router


class FakeRetriever:
    def __init__(self, sources: list[SourceChunk]):
        self.sources = sources
        self.calls: list[tuple[str, str, int]] = []

    def search(self, project_id: str, question: str, top_k: int) -> list[SourceChunk]:
        self.calls.append((project_id, question, top_k))
        return self.sources


class FakeLLM:
    def __init__(self, answer: str):
        self.answer = answer
        self.prompts: list[str] = []

    def generate(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return self.answer


def source(file_path: str, start_line: int, end_line: int, content: str) -> SourceChunk:
    return SourceChunk(file_path, start_line, end_line, content)


def test_answer_uses_top_k_deduplicated_sources_and_citations():
    retriever = FakeRetriever(
        [
            source("a.py", 1, 2, "one"),
            source("a.py", 1, 2, "one"),
            source("b.py", 3, 4, "two"),
        ]
    )
    llm = FakeLLM("grounded answer")

    result = QAService(retriever, llm, context_limit=100).answer("demo", "where?", top_k=2)

    assert result.answer == "grounded answer"
    assert [item.file_path for item in result.sources] == ["a.py", "b.py"]
    assert retriever.calls == [("demo", "where?", 2)]
    assert "a.py:1-2" in llm.prompts[0]
    assert "b.py:3-4" in llm.prompts[0]


def test_answer_limits_used_sources_to_top_k_when_retriever_returns_more():
    retriever = FakeRetriever(
        [
            source("a.py", 1, 1, "one"),
            source("b.py", 1, 1, "two"),
            source("c.py", 1, 1, "three"),
        ]
    )
    llm = FakeLLM("grounded answer")

    result = QAService(retriever, llm).answer("demo", "where?", top_k=2)

    assert [item.file_path for item in result.sources] == ["a.py", "b.py"]
    assert "a.py:1-1" in llm.prompts[0]
    assert "b.py:1-1" in llm.prompts[0]
    assert "c.py:1-1" not in llm.prompts[0]


def test_answer_rejects_non_positive_top_k():
    service = QAService(FakeRetriever([]), FakeLLM("unused"))

    with pytest.raises(ValueError, match="top_k"):
        service.answer("demo", "where?", top_k=0)


def test_answer_prompt_requires_insufficient_evidence_and_forbids_fabrication():
    llm = FakeLLM("grounded answer")

    QAService(FakeRetriever([source("a.py", 1, 1, "code")]), llm).answer("demo", "where?")

    prompt = llm.prompts[0]
    assert "未在当前代码库中找到足够依据。" in prompt
    assert "仅使用提供的代码上下文" in prompt
    assert "不得编造事实" in prompt


def test_answer_applies_context_limit_before_adding_each_source():
    retriever = FakeRetriever(
        [source("a.py", 1, 1, "1234"), source("b.py", 1, 1, "5678")]
    )
    llm = FakeLLM("grounded answer")

    result = QAService(retriever, llm, context_limit=4).answer("demo", "where?")

    assert [item.file_path for item in result.sources] == ["a.py"]
    assert "a.py:1-1" in llm.prompts[0]
    assert "b.py:1-1" not in llm.prompts[0]


def test_answer_keeps_chunks_with_same_location_and_different_content():
    retriever = FakeRetriever(
        [source("a.py", 1, 1, "first version"), source("a.py", 1, 1, "second version")]
    )
    llm = FakeLLM("grounded answer")

    result = QAService(retriever, llm).answer("demo", "where?")

    assert [item.content for item in result.sources] == ["first version", "second version"]


def test_answer_returns_insufficient_evidence_without_calling_llm():
    llm = FakeLLM("unused")

    result = QAService(FakeRetriever([]), llm).answer("demo", "where?")

    assert result.answer == INSUFFICIENT_EVIDENCE_MESSAGE
    assert result.sources == []
    assert llm.prompts == []


def test_answer_uses_confirmed_chinese_insufficient_evidence_message():
    result = QAService(FakeRetriever([]), FakeLLM("unused")).answer("demo", "where?")

    assert result.answer == "未在当前代码库中找到足够依据。"


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


def test_openai_llm_reports_empty_choices_clearly():
    class EmptyResponseClient:
        class chat:
            class completions:
                @staticmethod
                def create(**_kwargs):
                    return type("Response", (), {"choices": []})()

    llm = OpenAILLM.__new__(OpenAILLM)
    llm._client = EmptyResponseClient()
    llm._model = "test-model"

    with pytest.raises(RuntimeError, match="no choices"):
        llm.generate("question")


def test_openai_llm_reports_missing_choices_clearly():
    class MissingChoicesResponseClient:
        class chat:
            class completions:
                @staticmethod
                def create(**_kwargs):
                    return object()

    llm = OpenAILLM.__new__(OpenAILLM)
    llm._client = MissingChoicesResponseClient()
    llm._model = "test-model"

    with pytest.raises(RuntimeError, match="no choices"):
        llm.generate("question")


def make_client(service: QAService) -> TestClient:
    app = FastAPI()
    app.include_router(create_chat_router(service))
    return TestClient(app)


def test_chat_endpoint_returns_answer_and_exact_sources():
    service = QAService(
        FakeRetriever([source("src/main.py", 1, 2, "def main(): pass")]),
        FakeLLM("grounded answer"),
    )

    response = make_client(service).post(
        "/api/chat",
        json={"project_id": "demo", "question": "entry?", "top_k": 1},
    )

    assert response.status_code == 200
    assert response.json() == {
        "answer": "grounded answer",
        "sources": [
            {
                "file_path": "src/main.py",
                "start_line": 1,
                "end_line": 2,
                "content": "def main(): pass",
            }
        ],
    }


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"project_id": "   ", "question": "entry?"}, "project_id"),
        ({"project_id": "demo", "question": "   "}, "question"),
        ({"project_id": "demo", "question": "entry?", "top_k": 0}, "top_k"),
    ],
)
def test_chat_endpoint_validates_question_and_top_k(payload: dict[str, object], field: str):
    response = make_client(QAService(FakeRetriever([]), FakeLLM("unused"))).post(
        "/api/chat", json=payload
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][-1] == field


def test_chat_endpoint_turns_llm_failure_into_readable_detail():
    class FailingLLM:
        def generate(self, prompt: str) -> str:
            raise RuntimeError("provider unavailable")

    service = QAService(
        FakeRetriever([source("src/main.py", 1, 1, "code")]), FailingLLM()
    )

    response = make_client(service).post(
        "/api/chat", json={"project_id": "demo", "question": "entry?"}
    )

    assert response.status_code == 502
    assert response.json() == {"detail": "LLM request failed: provider unavailable"}


def test_chat_endpoint_turns_real_adapter_error_into_readable_detail():
    class MisconfiguredRetriever:
        def search(self, project_id: str, question: str, top_k: int) -> list[SourceChunk]:
            raise RealAdapterConfigurationError("real retrieval is not configured")

    response = make_client(QAService(MisconfiguredRetriever(), FakeLLM("unused"))).post(
        "/api/chat", json={"project_id": "demo", "question": "entry?"}
    )

    assert response.status_code == 503
    assert response.json() == {"detail": "QA real-mode configuration error: real retrieval is not configured"}
