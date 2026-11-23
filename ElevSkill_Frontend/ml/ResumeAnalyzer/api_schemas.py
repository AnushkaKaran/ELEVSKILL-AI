"""
Pydantic request and response schemas for the CareerPilot AI Resume Analyzer FastAPI service.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field, field_validator


MAX_RESUME_CHARS = 25_000
MAX_JD_CHARS = 12_000


class AnalyzeRequest(BaseModel):
    resume_text: str = Field(
        ...,
        min_length=1,
        max_length=MAX_RESUME_CHARS,
        description="Plain-text resume content (1 to 25,000 characters).",
    )
    job_description: Optional[str] = Field(
        default=None,
        max_length=MAX_JD_CHARS,
        description="Optional target job description (up to 12,000 characters).",
    )

    @field_validator("resume_text")
    @classmethod
    def validate_non_empty_resume(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("resume_text must not be empty or whitespace only.")
        return value


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_source: str


class ErrorResponse(BaseModel):
    detail: str
    error_code: str
