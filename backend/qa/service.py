from .models import LLMClient, QAResult, Retriever, SourceChunk


INSUFFICIENT_EVIDENCE_MESSAGE = "未在当前代码库中找到足够依据。"


class QAService:
    def __init__(self, retriever: Retriever, llm: LLMClient, context_limit: int = 12_000):
        self._retriever = retriever
        self._llm = llm
        self._context_limit = context_limit

    def answer(self, project_id: str, question: str, top_k: int = 5) -> QAResult:
        if top_k < 1:
            raise ValueError("top_k must be positive")
        sources = self._usable_sources(self._retriever.search(project_id, question, top_k), top_k)
        if not sources:
            return QAResult(answer=INSUFFICIENT_EVIDENCE_MESSAGE, sources=[])
        return QAResult(answer=self._llm.generate(self._build_prompt(question, sources)), sources=sources)

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
    def _build_prompt(question: str, sources: list[SourceChunk]) -> str:
        context = "\n\n".join(
            f"[BEGIN SOURCE {item.file_path}:{item.start_line}-{item.end_line}]\n"
            f"{item.content}\n[END SOURCE]"
            for item in sources
        )
        return (
            "仅使用提供的代码上下文回答问题，不得编造事实。"
            f"如果上下文不足，请严格回复：{INSUFFICIENT_EVIDENCE_MESSAGE}"
            "请在回答中标注引用的文件路径和行号。\n\n"
            f"问题：{question}\n\n代码上下文：\n{context}"
        )
