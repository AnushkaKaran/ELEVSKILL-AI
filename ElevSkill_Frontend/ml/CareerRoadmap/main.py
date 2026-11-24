"""
CareerPilot AI — Phase 3F-3: FastAPI Career Roadmap Service
===========================================================
Exposes the local CareerRoadmapEngine over HTTP:
  - GET /health
  - POST /generate

Privacy & Reliability:
  - Loads the locally saved all-MiniLM-L6-v2 model once at startup via lifespan.
  - Keeps inference offline (no model downloads during API startup).
  - Never logs resume text, project descriptions, or personal profile fields.
  - Never exposes stack traces or local filesystem paths in API responses.
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

from api_schemas import ErrorResponse, HealthResponse, RoadmapRequest
from career_roadmap import CareerRoadmapEngine

logger = logging.getLogger("careerpilot.career_roadmap_api")
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


def create_app(model_path: Optional[str] = None) -> FastAPI:
    """Application factory allowing custom model paths for testing failure handling."""

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        target_path = model_path if model_path is not None else str(LOCAL_MODEL_DIR)
        engine = CareerRoadmapEngine(model_path=target_path)
        application.state.engine = engine
        application.state.model_loaded = False
        application.state.offline_mode = False
        application.state.engine_ready = False
        application.state.model_name = Path(target_path).name or "all-MiniLM-L6-v2"

        if not Path(target_path).exists():
            logger.error("Local Career Roadmap model directory is missing.")
        else:
            try:
                engine._get_model()
                application.state.model_loaded = True
                application.state.offline_mode = True
                application.state.engine_ready = True
                logger.info(
                    "CareerRoadmapEngine initialized offline (%s).",
                    application.state.model_name,
                )
            except Exception:
                application.state.model_loaded = False
                application.state.offline_mode = False
                application.state.engine_ready = False
                logger.error("Failed to initialize CareerRoadmapEngine at startup.")

        yield

        application.state.engine = None
        application.state.model_loaded = False
        application.state.offline_mode = False
        application.state.engine_ready = False

    application = FastAPI(
        title="CareerPilot AI — Career Roadmap API",
        version="1.0.0",
        description="Local, privacy-preserving hybrid ML Career Roadmap service.",
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
        logger.error("Unhandled internal error during Career Roadmap API request.")
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
        offline = bool(getattr(request.app.state, "offline_mode", False))
        ready = bool(getattr(request.app.state, "engine_ready", False))
        model_name = str(getattr(request.app.state, "model_name", "all-MiniLM-L6-v2"))
        return HealthResponse(
            status="ok" if (loaded and ready) else "degraded",
            model_loaded=loaded,
            model_name=model_name,
            offline_mode=offline,
            engine_ready=ready,
        )

    @application.post(
        "/generate",
        responses={
            422: {"model": ErrorResponse},
            500: {"model": ErrorResponse},
            503: {"model": ErrorResponse},
        },
    )
    def generate_roadmap_endpoint(payload: RoadmapRequest, request: Request) -> Dict[str, Any]:
        loaded = bool(getattr(request.app.state, "model_loaded", False))
        ready = bool(getattr(request.app.state, "engine_ready", False))
        engine: Optional[CareerRoadmapEngine] = getattr(request.app.state, "engine", None)

        if not loaded or not ready or engine is None:
            return JSONResponse(
                status_code=503,
                content=ErrorResponse(
                    detail="Career Roadmap ML model is currently unavailable.",
                    error_code="MODEL_UNAVAILABLE",
                ).model_dump(),
            )

        try:
            result = engine.generate_roadmap(
                target_role=payload.target_role,
                experience_level=payload.experience_level,
                education=payload.education,
                known_skills=payload.known_skills,
                completed_skills=payload.completed_skills,
                project_descriptions=payload.project_descriptions,
                resume_text=payload.resume_text,
            )
        except Exception:
            logger.error("Unexpected runtime error during roadmap generation.")
            return JSONResponse(
                status_code=500,
                content=ErrorResponse(
                    detail="An internal error occurred while generating the career roadmap.",
                    error_code="INTERNAL_ERROR",
                ).model_dump(),
            )

        if result.get("error_code") == "MODEL_UNAVAILABLE":
            return JSONResponse(
                status_code=503,
                content=ErrorResponse(
                    detail="Career Roadmap ML model is currently unavailable.",
                    error_code="MODEL_UNAVAILABLE",
                ).model_dump(),
            )

        if result.get("error_code") == "INVALID_INPUT":
            return JSONResponse(
                status_code=422,
                content=ErrorResponse(
                    detail=result.get("error", "Invalid roadmap request input."),
                    error_code="INVALID_INPUT",
                ).model_dump(),
            )

        sanitized = {
            **result,
            "model_used": str(getattr(request.app.state, "model_name", "all-MiniLM-L6-v2")),
        }
        logger.info(
            "Processed roadmap request (valid=%s, canonical_role=%s)",
            sanitized.get("valid"),
            sanitized.get("target_role"),
        )
        return sanitized

    return application


app = create_app()
