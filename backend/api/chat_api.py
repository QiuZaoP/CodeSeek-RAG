"""HTTP entry point for the grounded QA service."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from backend.qa.adapters import RealAdapterConfigurationError
from backend.qa.service import QAService


class ChatRequest(BaseModel):
    project_id: str
    question: str
    top_k: int = Field(default=5, ge=1)

    @field_validator("project_id", "question")
    @classmethod
    def required_text_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("value must not be blank")
        return value


class SourceResponse(BaseModel):
    file_path: str
    start_line: int
    end_line: int
    content: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceResponse]


def create_chat_router(service: QAService) -> APIRouter:
    """Create an independently testable chat router backed by ``service``."""

    router = APIRouter()

    @router.post("/api/chat", response_model=ChatResponse)
    def chat(request: ChatRequest) -> ChatResponse:
        try:
            result = service.answer(request.project_id, request.question, request.top_k)
        except RealAdapterConfigurationError as error:
            raise HTTPException(
                status_code=503,
                detail=f"QA real-mode configuration error: {error}",
            ) from error
        except RuntimeError as error:
            raise HTTPException(status_code=502, detail=f"LLM request failed: {error}") from error

        return ChatResponse(
            answer=result.answer,
            sources=[
                SourceResponse(
                    file_path=item.file_path,
                    start_line=item.start_line,
                    end_line=item.end_line,
                    content=item.content,
                )
                for item in result.sources
            ],
        )

    return router
