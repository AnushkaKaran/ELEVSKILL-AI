"""
Pydantic request and response schemas for the CareerPilot AI Interview Coach FastAPI service.
"""

from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

from interview_coach import MAX_ANSWER_CHARS, QUESTION_BANK

CategoryType = Literal[
    "behavioral",
    "frontend",
    "backend",
    "python",
    "cpp",
    "java",
    "csharp",
    "dotnet",
    "mern",
    "dsa",
    "dbms",
    "os",
    "networks",
    "aiml",
    "datascience",
    "logic",
    "general",
]


class EvaluateRequest(BaseModel):
    answer_text: str = Field(
        ...,
        min_length=1,
        max_length=MAX_ANSWER_CHARS,
        description="Candidate interview answer text (1 to 6,000 characters).",
    )
    category: CategoryType = Field(
        ...,
        description="Interview category: behavioral, frontend, dsa, or general.",
    )
    question_text: Optional[str] = Field(
        default=None,
        max_length=1_000,
        description="Interview question prompt text.",
    )
    question_id: Optional[str] = Field(
        default=None,
        max_length=64,
        description="Optional built-in question identifier (e.g., beh-1, fe-1).",
    )
    expected_concepts: Optional[List[str]] = Field(
        default=None,
        max_length=15,
        description="Optional list of expected rubric concepts for the question.",
    )

    @field_validator("answer_text")
    @classmethod
    def validate_non_empty_answer(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("answer_text must not be empty or whitespace only.")
        return value

    @field_validator("question_text")
    @classmethod
    def validate_question_text_if_present(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not value.strip():
            raise ValueError("question_text must not be whitespace only when provided.")
        return value

    @model_validator(mode="after")
    def validate_question_reference(self) -> "EvaluateRequest":
        has_text = bool(self.question_text and self.question_text.strip())
        has_valid_id = bool(self.question_id and self.question_id in QUESTION_BANK)
        if not has_text and not has_valid_id:
            raise ValueError("Provide either question_text or a valid built-in question_id.")
        return self


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str
    offline_available: bool


class ErrorResponse(BaseModel):
    detail: str
    error_code: str
