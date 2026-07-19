from .models import ConversationTurn, LLMClient, QAResult, Retriever, SourceChunk


INSUFFICIENT_EVIDENCE_MESSAGE = "未在当前代码库中找到足够依据。"
MAX_HISTORY_TURNS = 8
DEFAULT_HISTORY_CONTEXT_LIMIT = 6_000


class QAService:
    def __init__(
        self,
        retriever: Retriever,
        llm: LLMClient,
        context_limit: int = 12_000,
        history_context_limit: int = DEFAULT_HISTORY_CONTEXT_LIMIT,
    ):
        self._retriever = retriever
        self._llm = llm
        self._context_limit = context_limit
        self._history_context_limit = history_context_limit

    def answer(
        self,
        project_id: str,
        question: str,
        top_k: int = 5,
        history: list[ConversationTurn] | None = None,
    ) -> QAResult:
        if top_k < 1:
            raise ValueError("top_k must be positive")
        usable_history = self._usable_history(history or [])
        retrieval_question = self._build_retrieval_question(question, usable_history)
        sources = self._usable_sources(
            self._retriever.search(project_id, retrieval_question, top_k), top_k
        )
        if not sources:
            return QAResult(answer=INSUFFICIENT_EVIDENCE_MESSAGE, sources=[])
        return QAResult(
            answer=self._llm.generate(
                self._build_prompt(question, sources, usable_history)
            ),
            sources=sources,
        )

    def _usable_history(self, history: list[ConversationTurn]) -> list[ConversationTurn]:
        selected: list[ConversationTurn] = []
        remaining = self._history_context_limit
        for item in reversed(history[-MAX_HISTORY_TURNS:]):
            question = item.question.strip()
            answer = item.answer.strip()
            if not question or not answer or remaining <= len(question):
                continue

            answer = answer[: max(0, remaining - len(question))]
            if not answer:
                continue
            selected.append(ConversationTurn(question=question, answer=answer))
            remaining -= len(question) + len(answer)

        selected.reverse()
        return selected

    def _usable_sources(self, retrieved: list[SourceChunk], top_k: int) -> list[SourceChunk]:
        seen: set[tuple[str, int, int, str]] = set()
        sources: list[SourceChunk] = []
        context_size = 0
        for item in retrieved:
            identity = (item.file_path, item.start_line, item.end_line, item.content)
            if identity in seen:
                continue
            seen.add(identity)
            if not item.content or context_size + len(item.content) > self._context_limit:
                continue
            sources.append(item)
            context_size += len(item.content)
            if len(sources) == top_k:
                break
        return sources

    @staticmethod
    def _build_retrieval_question(
        question: str, history: list[ConversationTurn]
    ) -> str:
        if not history:
            return question
        conversation = "\n".join(
            f"用户：{item.question}\n助手：{item.answer}" for item in history
        )
        return f"{conversation}\n用户当前问题：{question}"

    @staticmethod
    def _build_prompt(
        question: str,
        sources: list[SourceChunk],
        history: list[ConversationTurn] | None = None,
    ) -> str:
        context = "\n\n".join(
            f"[BEGIN SOURCE {item.file_path}:{item.start_line}-{item.end_line}]\n"
            f"{item.content}\n[END SOURCE]"
            for item in sources
        )
        conversation = "\n".join(
            f"用户：{item.question}\n助手：{item.answer}" for item in history or []
        )
        history_section = (
            "对话历史（仅用于理解指代和追问，不作为代码事实依据）：\n"
            f"{conversation}\n\n"
            if conversation
            else ""
        )
        return (
            "仅使用提供的代码上下文回答问题，不得编造事实。"
            f"如果上下文不足，请严格回复：{INSUFFICIENT_EVIDENCE_MESSAGE}"
            "请在回答中标注引用的文件路径和行号。\n\n"
            f"{history_section}当前问题：{question}\n\n代码上下文：\n{context}"
        )
