"""
Pydantic request and response schemas for the CareerPilot AI Career Roadmap FastAPI service.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

from career_roadmap import MAX_TEXT_CHARS


class RoadmapRequest(BaseModel):
    target_role: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description="Target career role (1 to 300 characters, non-whitespace).",
    )
    experience_level: Optional[str] = Field(default=None, max_length=200)
    education: Optional[str] = Field(default=None, max_length=500)
    known_skills: Optional[List[str]] = Field(default=None, max_length=100)
    completed_skills: Optional[List[str]] = Field(default=None, max_length=100)
    project_descriptions: Optional[List[str]] = Field(default=None, max_length=30)
    resume_text: Optional[str] = Field(default=None, max_length=MAX_TEXT_CHARS)

    @field_validator("target_role")
    @classmethod
    def validate_target_role(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("target_role must not be empty or whitespace only.")
        return cleaned

    @field_validator("experience_level", "education", "resume_text")
    @classmethod
    def trim_optional_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned if cleaned else None

    @field_validator("known_skills", "completed_skills")
    @classmethod
    def validate_skill_lists(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return None
        cleaned_items: List[str] = []
        for item in value:
            s = item.strip()
            if len(s) > 200:
                raise ValueError("Individual skill items must not exceed 200 characters.")
            if s:
                cleaned_items.append(s)
        return cleaned_items

    @field_validator("project_descriptions")
    @classmethod
    def validate_project_descriptions(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return None
        cleaned_items: List[str] = []
        for item in value:
            s = item.strip()
            if len(s) > 2_000:
                raise ValueError("Each project description must not exceed 2,000 characters.")
            if s:
                cleaned_items.append(s)
        return cleaned_items


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str
    offline_mode: bool
    engine_ready: bool


class ErrorResponse(BaseModel):
    detail: str
    error_code: str
