"""
CareerPilot AI — Phase 3E-3: FastAPI Job Matcher Service
========================================================
Exposes the local 5-dimensional JobMatcherEngine over HTTP:
  - GET /health
  - POST /match

Privacy & Reliability:
  - Loads the locally saved all-MiniLM-L6-v2 model once at startup via lifespan.
  - Enforces offline local loading (no model downloads during API startup).
  - Never logs candidate profiles, job descriptions, or stack traces.
  - Restricts CORS to local React/Vite development origins.
"""

from __future__ import annotations

import logging
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

os.environ.setdefault("MALLOC_ARENA_MAX", "2")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api_schemas import ErrorResponse, HealthResponse, JobMatchRequest
from job_matcher import JobMatcherEngine

logger = logging.getLogger("careerpilot.job_matcher_api")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

DEFAULT_LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

LOCAL_MODEL_DIR = Path(__file__).resolve().parent / "models" / "all-MiniLM-L6-v2"


def get_allowed_origins() -> List[str]:
    """Parses comma-separated ALLOWED_ORIGINS; defaults to local dev origins when unset."""
    raw = os.getenv("ALLOWED_ORIGINS", "")
    configured = [
        origin.strip().rstrip("/")
        for origin in raw.split(",")
        if origin.strip() and origin.strip() != "*"
    ]
    if configured:
        return configured
    return list(DEFAULT_LOCAL_ORIGINS)


def create_app(model_name_or_path: Optional[str] = None) -> FastAPI:
    """Application factory allowing custom model paths for testing failure handling."""

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        target_path = model_name_or_path if model_name_or_path is not None else str(LOCAL_MODEL_DIR)
        engine = JobMatcherEngine(model_name_or_path=target_path)
        application.state.engine = engine
        application.state.model_loaded = False
        application.state.offline_available = False
        application.state.model_name = Path(target_path).name or "all-MiniLM-L6-v2"

        if not Path(target_path).exists():
            logger.error("Local Job Matcher model directory is missing.")
        else:
            try:
                engine._get_model()
                application.state.model_loaded = True
                application.state.offline_available = True
                logger.info("JobMatcherEngine initialized offline (%s).", application.state.model_name)
            except Exception:
                application.state.model_loaded = False
                application.state.offline_available = False
                logger.error("Failed to initialize JobMatcherEngine at startup.")

        yield

        application.state.engine = None
        application.state.model_loaded = False
        application.state.offline_available = False

    application = FastAPI(
        title="CareerPilot AI — Job Matcher API",
        version="1.0.0",
        description="Local, privacy-preserving 5-dimensional job-to-profile matching service.",
        lifespan=lifespan,
    )
    application.state.inference_lock = threading.Lock()

    application.add_middleware(
        CORSMiddleware,
        allow_origins=get_allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept"],
    )

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, _exc: Exception) -> JSONResponse:
        logger.error("Unhandled internal error during Job Matcher API request.")
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                detail="An internal error occurred while processing the request.",
                error_code="INTERNAL_ERROR",
            ).model_dump(),
        )

    @application.get("/health", response_model=HealthResponse)
    def health_check(request: Request) -> HealthResponse:
        loaded = bool(getattr(request.app.state, "model_loaded", False))
        offline = bool(getattr(request.app.state, "offline_available", False))
        model_name = str(getattr(request.app.state, "model_name", "all-MiniLM-L6-v2"))
        return HealthResponse(
            status="ok" if loaded else "degraded",
            model_loaded=loaded,
            model_name=model_name,
            offline_available=offline,
        )

    @application.post(
        "/match",
        responses={
            422: {"model": ErrorResponse},
            503: {"model": ErrorResponse},
        },
    )
    def match_job_endpoint(payload: JobMatchRequest, request: Request) -> Dict[str, Any]:
        loaded = bool(getattr(request.app.state, "model_loaded", False))
        engine: Optional[JobMatcherEngine] = getattr(request.app.state, "engine", None)

        if not loaded or engine is None:
            return JSONResponse(
                status_code=503,
                content=ErrorResponse(
                    detail="Job Matcher ML model is currently unavailable.",
                    error_code="MODEL_UNAVAILABLE",
                ).model_dump(),
            )

        inference_lock = getattr(request.app.state, "inference_lock", None)
        try:
            if inference_lock is not None:
                with inference_lock:
                    result = engine.match(
                        profile=payload.profile.model_dump(),
                        job=payload.job.model_dump(),
                    )
            else:
                result = engine.match(
                    profile=payload.profile.model_dump(),
                    job=payload.job.model_dump(),
                )
        except Exception:
            logger.error("Runtime inference error during job matching.")
            return JSONResponse(
                status_code=503,
                content=ErrorResponse(
                    detail="Job Matcher service is temporarily unavailable.",
                    error_code="INFERENCE_UNAVAILABLE",
                ).model_dump(),
            )

        if not result.get("valid", False):
            return JSONResponse(
                status_code=422,
                content=ErrorResponse(
                    detail=result.get("error", "Invalid job matching input."),
                    error_code="INVALID_INPUT",
                ).model_dump(),
            )

        sanitized = {
            **result,
            "model_used": str(getattr(request.app.state, "model_name", "all-MiniLM-L6-v2")),
        }
        logger.info("Completed job match evaluation (score=%s)", sanitized.get("overall_match_score"))
        return sanitized

    return application


app = create_app()
