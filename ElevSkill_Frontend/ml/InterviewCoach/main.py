"""
CareerPilot AI — Phase 3D-3: FastAPI Interview Coach Service
===========================================================
Exposes the local category-aware InterviewCoachEngine over HTTP:
  - GET /health
  - POST /evaluate

Privacy & Reliability:
  - Loads the locally saved all-MiniLM-L6-v2 model once at startup via lifespan.
  - Enforces offline local loading (no model downloads during API startup).
  - Never logs candidate answers or exposes stack traces / local filesystem paths.
  - Restricts CORS to local React/Vite development origins.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api_schemas import ErrorResponse, EvaluateRequest, HealthResponse
from interview_coach import InterviewCoachEngine

logger = logging.getLogger("careerpilot.interview_coach_api")
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
    """Application factory supporting custom model paths for testing failure handling."""

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        target_path = model_name_or_path if model_name_or_path is not None else str(LOCAL_MODEL_DIR)
        engine = InterviewCoachEngine(model_name_or_path=target_path)
        application.state.engine = engine
        application.state.model_loaded = False
        application.state.offline_available = False
        application.state.model_name = Path(target_path).name or "all-MiniLM-L6-v2"

        if not Path(target_path).exists():
            logger.error("Local Interview Coach model directory is missing.")
        else:
            try:
                engine._get_model()
                application.state.model_loaded = True
                application.state.offline_available = True
                logger.info("InterviewCoachEngine initialized offline (%s).", application.state.model_name)
            except Exception:
                application.state.model_loaded = False
                application.state.offline_available = False
                logger.error("Failed to initialize InterviewCoachEngine at startup.")

        yield

        application.state.engine = None
        application.state.model_loaded = False
        application.state.offline_available = False

    application = FastAPI(
        title="CareerPilot AI — Interview Coach API",
        version="1.0.0",
        description="Local, privacy-preserving NLP interview answer evaluation service.",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=get_allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept"],
    )

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, _exc: Exception) -> JSONResponse:
        logger.error("Unhandled internal error during Interview Coach API request.")
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
        "/evaluate",
        responses={
            422: {"model": ErrorResponse},
            503: {"model": ErrorResponse},
        },
    )
    def evaluate_answer_endpoint(payload: EvaluateRequest, request: Request) -> Dict[str, Any]:
        loaded = bool(getattr(request.app.state, "model_loaded", False))
        engine: Optional[InterviewCoachEngine] = getattr(request.app.state, "engine", None)

        if not loaded or engine is None:
            return JSONResponse(
                status_code=503,
                content=ErrorResponse(
                    detail="Interview Coach ML model is currently unavailable.",
                    error_code="MODEL_UNAVAILABLE",
                ).model_dump(),
            )

        try:
            result = engine.evaluate(
                answer_text=payload.answer_text,
                category=payload.category,
                question_text=payload.question_text,
                question_id=payload.question_id,
                expected_concepts=payload.expected_concepts,
            )
        except Exception:
            logger.error("Runtime inference error during interview answer evaluation.")
            return JSONResponse(
                status_code=503,
                content=ErrorResponse(
                    detail="Interview evaluation service is temporarily unavailable.",
                    error_code="INFERENCE_UNAVAILABLE",
                ).model_dump(),
            )

        if not result.get("valid", False):
            return JSONResponse(
                status_code=422,
                content=ErrorResponse(
                    detail=result.get("error", "Invalid evaluation input."),
                    error_code="INVALID_INPUT",
                ).model_dump(),
            )

        # Sanitize model_used so internal filesystem paths are not leaked
        sanitized = {
            **result,
            "model_used": str(getattr(request.app.state, "model_name", "all-MiniLM-L6-v2")),
        }
        logger.info(
            "Evaluated interview answer (category=%s, score=%s)",
            payload.category,
            sanitized.get("overall_score"),
        )
        return sanitized

    return application


app = create_app()
