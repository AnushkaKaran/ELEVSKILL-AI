"""
Pydantic request and response schemas for the CareerPilot AI Job Matcher FastAPI service.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

from job_matcher import MAX_TEXT_CHARS, MIN_JD_WORDS


class ProfileInput(BaseModel):
    resume_text: Optional[str] = Field(default=None, max_length=MAX_TEXT_CHARS)
    skills: Optional[List[str]] = Field(default=None, max_length=100)
    project_descriptions: Optional[List[str]] = Field(default=None, max_length=30)
    education: Optional[str] = Field(default=None, max_length=500)
    target_role: Optional[str] = Field(default=None, max_length=200)
    experience_level: Optional[str] = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def validate_profile_has_content(self) -> "ProfileInput":
        has_resume = bool(self.resume_text and self.resume_text.strip())
        has_skills = bool(self.skills and any(s.strip() for s in self.skills))
        has_projects = bool(
            self.project_descriptions and any(p.strip() for p in self.project_descriptions)
        )
        if not (has_resume or has_skills or has_projects):
            raise ValueError(
                "Profile must include resume_text, skills, or project_descriptions."
            )
        return self


class JobInput(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    company: Optional[str] = Field(default=None, max_length=200)
    description: str = Field(..., min_length=1, max_length=MAX_TEXT_CHARS)
    required_skills: Optional[List[str]] = Field(default=None, max_length=60)
    preferred_skills: Optional[List[str]] = Field(default=None, max_length=60)

    @field_validator("description")
    @classmethod
    def validate_description_length(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Job description must not be empty or whitespace only.")
        if len(cleaned.split()) < MIN_JD_WORDS:
            raise ValueError(
                f"Job description is insufficient (provide at least {MIN_JD_WORDS} words)."
            )
        return value


class JobMatchRequest(BaseModel):
    profile: ProfileInput
    job: JobInput


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str
    offline_available: bool


class ErrorResponse(BaseModel):
    detail: str
    error_code: str
