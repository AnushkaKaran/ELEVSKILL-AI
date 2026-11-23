"""
CareerPilot AI — Phase 3B: FastAPI Resume Analyzer Service
==========================================================
Exposes the local hybrid NLP ResumeAnalyzerEngine over HTTP:
  - GET /health
  - POST /analyze

Privacy & Reliability:
  - Loads the locally saved all-MiniLM-L6-v2 model once at startup via lifespan.
  - Never logs resume text, job descriptions, or personal information.
  - Restricts CORS to local React/Vite development origins.
"""

from __future__ import annotations

import io
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pypdf import PdfReader

from api_schemas import AnalyzeRequest, ErrorResponse, HealthResponse
from resume_analyzer import ResumeAnalyzerEngine

logger = logging.getLogger("careerpilot.api")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]


def create_app(model_name_or_path: Optional[str] = None) -> FastAPI:
    """Application factory allowing custom model paths for testing failure handling."""

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        engine = ResumeAnalyzerEngine(model_name_or_path=model_name_or_path)
        application.state.engine = engine
        application.state.model_loaded = False
        application.state.model_error = None

        try:
            engine._get_model()
            application.state.model_loaded = True
            logger.info("ResumeAnalyzerEngine initialized from local source: %s", engine.model_source)
        except Exception:
            application.state.model_loaded = False
            application.state.model_error = "Failed to load the local NLP embedding model."
            logger.error("Failed to initialize ResumeAnalyzerEngine at startup.")

        yield

        application.state.engine = None
        application.state.model_loaded = False

    application = FastAPI(
        title="CareerPilot AI — Resume Analyzer API",
        version="1.0.0",
        description="Local, privacy-preserving hybrid NLP resume analysis service.",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept"],
    )

    @application.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, _exc: Exception) -> JSONResponse:
        logger.error("Unhandled error during API request processing.")
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                detail="An internal error occurred while processing the request.",
                error_code="INTERNAL_ERROR",
            ).model_dump(),
        )

    @application.get("/health", response_model=HealthResponse)
    def health_check(request: Request) -> HealthResponse:
        engine: Optional[ResumeAnalyzerEngine] = getattr(request.app.state, "engine", None)
        loaded: bool = bool(getattr(request.app.state, "model_loaded", False))
        raw_source = engine.model_source if engine else "unavailable"
        logical_source = Path(raw_source).name if (loaded and raw_source and raw_source != "unavailable") else "unavailable"
        return HealthResponse(
            status="ok" if loaded else "degraded",
            model_loaded=loaded,
            model_source=logical_source,
        )

    @application.post(
        "/analyze",
        responses={
            400: {"model": ErrorResponse},
            503: {"model": ErrorResponse},
        },
    )
    def analyze(payload: AnalyzeRequest, request: Request) -> Dict[str, Any]:
        loaded: bool = bool(getattr(request.app.state, "model_loaded", False))
        engine: Optional[ResumeAnalyzerEngine] = getattr(request.app.state, "engine", None)

        if not loaded or engine is None:
            return JSONResponse(
                status_code=503,
                content=ErrorResponse(
                    detail=getattr(request.app.state, "model_error", None)
                    or "NLP model is not loaded.",
                    error_code="MODEL_UNAVAILABLE",
                ).model_dump(),
            )

        result = engine.analyze(payload.resume_text, payload.job_description)
        if not result.get("valid", False):
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    detail=result.get("error", "Invalid resume input."),
                    error_code="INVALID_INPUT",
                ).model_dump(),
            )

        logger.info(
            "Analyzed resume (has_jd=%s, score=%s)",
            bool(payload.job_description and payload.job_description.strip()),
            result.get("overall_score"),
        )
        return result

    @application.post(
        "/extract-pdf",
        responses={
            400: {"model": ErrorResponse},
            422: {"model": ErrorResponse},
        },
    )
    async def extract_pdf(file: UploadFile = File(...)) -> Dict[str, Any]:
        filename = (file.filename or "resume.pdf").strip()
        if not filename.lower().endswith(".pdf"):
            return JSONResponse(
                status_code=422,
                content=ErrorResponse(
                    detail="Invalid file type. Please upload a PDF (.pdf) resume.",
                    error_code="INVALID_FILE_TYPE",
                ).model_dump(),
            )

        raw_bytes = await file.read()
        if not raw_bytes:
            return JSONResponse(
                status_code=422,
                content=ErrorResponse(
                    detail="Uploaded PDF file is empty.",
                    error_code="EMPTY_FILE",
                ).model_dump(),
            )

        if len(raw_bytes) > 5 * 1024 * 1024:
            return JSONResponse(
                status_code=422,
                content=ErrorResponse(
                    detail="PDF file exceeds the 5 MB size limit.",
                    error_code="FILE_TOO_LARGE",
                ).model_dump(),
            )

        if not raw_bytes.lstrip().startswith(b"%PDF"):
            return JSONResponse(
                status_code=422,
                content=ErrorResponse(
                    detail="The uploaded file does not appear to be a valid PDF document.",
                    error_code="INVALID_PDF_HEADER",
                ).model_dump(),
            )

        try:
            reader = PdfReader(io.BytesIO(raw_bytes))
            pages_text = []
            for page in reader.pages:
                text = page.extract_text() or ""
                if text.strip():
                    pages_text.append(text.strip())
            extracted = "\n\n".join(pages_text).strip()
        except Exception:
            return JSONResponse(
                status_code=422,
                content=ErrorResponse(
                    detail="Unable to read the PDF file. It may be corrupted or password-protected.",
                    error_code="PDF_PARSE_ERROR",
                ).model_dump(),
            )

        if not extracted:
            return JSONResponse(
                status_code=422,
                content=ErrorResponse(
                    detail="No selectable text was found in this PDF (it may be a scanned image). Please paste your resume text instead.",
                    error_code="EMPTY_PDF_TEXT",
                ).model_dump(),
            )

        cleaned, _ = ResumeAnalyzerEngine._clean_text(extracted, 25_000)
        return {
            "filename": filename,
            "page_count": len(reader.pages),
            "extracted_text": cleaned,
            "char_count": len(cleaned),
        }

    return application


app = create_app()
