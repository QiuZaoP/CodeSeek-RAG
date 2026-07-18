"""Runtime adapters for the QA service.

The indexer remains the owner of vector-store access.  This module only calls
the indexer's public ``search(project_id, question, top_k)`` entry point.
"""

from collections.abc import Callable, Mapping
from importlib import import_module
from backend.qa.models import LLMClient, Retriever, SourceChunk


class RealAdapterConfigurationError(RuntimeError):
    """Raised when real QA dependencies are unavailable or misconfigured."""


class MockRetriever:
    """Deterministic development retriever with no implicit production use."""

    def search(self, project_id: str, question: str, top_k: int) -> list[SourceChunk]:
        return []


class MockLLM:
    """Deterministic development LLM with no network dependency."""

    def generate(self, prompt: str) -> str:
        return "Mock answer: no real LLM was called."


class PublicSearchRetriever:
    """Adapter around module 3's public search callable."""

    def __init__(self, search: Callable[[str, str, int], list[SourceChunk]]) -> None:
        self._search = search

    def search(self, project_id: str, question: str, top_k: int) -> list[SourceChunk]:
        return self._search(project_id, question, top_k)


class OpenAILLM:
    """Small OpenAI-compatible LLM adapter, loaded only in real mode."""

    def __init__(self, api_key: str, base_url: str, model: str) -> None:
        try:
            from openai import OpenAI
        except ImportError as error:
            raise RealAdapterConfigurationError(
                "Real LLM dependency is unavailable; install the 'openai' package."
            ) from error

        self._client = OpenAI(api_key=api_key, base_url=base_url)
        self._model = model

    def generate(self, prompt: str) -> str:
        response = self._client.chat.completions.create(
            model=self._model,
            messages=[{"role": "user", "content": prompt}],
        )
        content = response.choices[0].message.content
        if not content:
            raise RuntimeError("The configured LLM returned an empty response.")
        return content


def create_clients(environment: Mapping[str, str]) -> tuple[Retriever, LLMClient]:
    """Construct QA clients for an explicitly selected runtime mode.

    ``QA_MODE`` defaults to ``real``.  Real-mode configuration errors are
    deliberately returned to callers instead of being replaced by mock data.
    """

    mode = environment.get("QA_MODE", "real").lower()
    if mode == "mock":
        return MockRetriever(), MockLLM()
    if mode != "real":
        raise ValueError("QA_MODE must be either 'real' or 'mock'.")

    search = _load_real_search(environment)
    llm = _create_real_llm(environment)
    return PublicSearchRetriever(search), llm


def _load_real_search(environment: Mapping[str, str]) -> Callable[[str, str, int], list[SourceChunk]]:
    target = environment.get("QA_RETRIEVER_SEARCH")
    if not target:
        raise RealAdapterConfigurationError(
            "real retrieval is not configured. Set QA_RETRIEVER_SEARCH to the "
            "module 3 public search callable (for example, 'backend.indexer.api:search')."
        )

    try:
        module_name, attribute_name = target.split(":", 1)
        search = getattr(import_module(module_name), attribute_name)
    except (ImportError, ValueError, AttributeError) as error:
        raise RealAdapterConfigurationError(
            f"Real retrieval callable '{target}' could not be loaded. "
            "It must expose search(project_id, question, top_k)."
        ) from error

    if not callable(search):
        raise RealAdapterConfigurationError(
            f"Real retrieval callable '{target}' is not callable."
        )
    return search


def _create_real_llm(environment: Mapping[str, str]) -> OpenAILLM:
    missing = [name for name in ("LLM_API_KEY", "LLM_BASE_URL", "LLM_MODEL") if not environment.get(name)]
    if missing:
        raise RealAdapterConfigurationError(
            "Real LLM is not configured. Set " + ", ".join(missing) + "."
        )
    return OpenAILLM(
        api_key=environment["LLM_API_KEY"],
        base_url=environment["LLM_BASE_URL"],
        model=environment["LLM_MODEL"],
    )
