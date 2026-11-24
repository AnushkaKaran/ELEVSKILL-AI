# ELEVSKILL AI — Render Deployment Preparation Guide

This document defines the Render deployment configuration for all four ELEVSKILL AI Python FastAPI microservices and their Vercel frontend environment-variable mapping.

---

## Shared Runtime & Memory Considerations

- **Python Runtime:** `3.11.x` (local `.venv` verified on Python `3.11.9`). Set `PYTHON_VERSION=3.11.9` in Render if Render defaults to another version.
- **Bundled Offline Models:** Each service bundles `models/all-MiniLM-L6-v2` (`~87.3 MB` on disk, including `model.safetensors` at `86.65 MB`) using relative `Path(__file__).resolve().parent / "models" / "all-MiniLM-L6-v2"` paths. No runtime model downloads occur.
- **CORS (`ALLOWED_ORIGINS`):** All four services read `ALLOWED_ORIGINS` (comma-separated, whitespace-trimmed, wildcard `*` rejected). When `ALLOWED_ORIGINS` is set in production, only the configured origins are allowed (without permitting `localhost`); when unset, it defaults to local development origins (`http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:5174`, `http://127.0.0.1:5174`).
- **Memory & Render Instance Size Recommendation:**
  - Each service imports `torch` (via `sentence-transformers`), `transformers`, `scikit-learn`, `numpy`, and loads `all-MiniLM-L6-v2` into memory at startup.
  - Render **Free (512 MB RAM)** instances are **high-risk for OOM kills** during model initialization or concurrent inference under PyTorch + SentenceTransformers.
  - **Recommended:** Render **Starter (512 MB+ / Standard 2 GB RAM)** — specifically **Standard (2 GB RAM)** if PyTorch + SentenceTransformer RSS exceeds 512 MB on Linux, or verify peak RSS during Render's initial deploy logs.
- **Dependency Notes for Linux:** `requirements.txt` contains runtime packages only (`matplotlib`, `jupyter`, `nbformat`, `nbconvert`, `ipykernel`, `pytest` removed). `sentence-transformers` pulls `torch`; if pip resolves CUDA wheels on Linux, consider `--extra-index-url https://download.pytorch.org/whl/cpu` in the Render Build Command if needed to reduce build size/RAM.

---

## 1. Resume Analyzer Service

- **Directory:** `ElevSkill_Frontend/ml/ResumeAnalyzer`
- **Python Runtime:** `3.11.9`
- **Required Dependencies (`requirements.txt`):** `sentence-transformers>=3.0.0`, `scikit-learn>=1.5.0`, `numpy>=1.26.0`, `fastapi>=0.115.0`, `uvicorn>=0.32.0`, `pypdf>=5.0.0`, `python-multipart>=0.0.9`
- **Render Root Directory:** `ElevSkill_Frontend/ml/ResumeAnalyzer`
- **Render Build Command:** `pip install -r requirements.txt`
- **Render Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Required Environment Variables:**
  - `ALLOWED_ORIGINS=https://<your-vercel-domain>`
- **Health Endpoint:** `GET /health` (`200`, reports `status`, `model_loaded`, `model_source`)
- **AI Endpoints:** `POST /analyze`, `POST /extract-pdf` (in-memory 5 MB PDF limit; no persistent disk required)
- **Model Files:** `models/all-MiniLM-L6-v2/` (must be present in repo/LFS)
- **Local Verification:** Verified via `pytest test_api.py -v` (`12 passed`) and live `/health` + `/analyze` + CORS checks.

---

## 2. Interview Coach Service

- **Directory:** `ElevSkill_Frontend/ml/InterviewCoach`
- **Python Runtime:** `3.11.9`
- **Required Dependencies (`requirements.txt`):** `sentence-transformers>=3.0.0`, `scikit-learn>=1.5.0`, `numpy>=1.26.0`, `fastapi>=0.115.0`, `uvicorn>=0.32.0`
- **Render Root Directory:** `ElevSkill_Frontend/ml/InterviewCoach`
- **Render Build Command:** `pip install -r requirements.txt`
- **Render Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Required Environment Variables:**
  - `ALLOWED_ORIGINS=https://<your-vercel-domain>`
- **Health Endpoint:** `GET /health` (`200`, reports `status`, `model_loaded`, `model_name`, `offline_available`)
- **AI Endpoints:** `POST /evaluate`
- **Model Files:** `models/all-MiniLM-L6-v2/`
- **Local Verification:** Verified via `pytest test_api.py -v` and live `/health` + `/evaluate` + CORS checks.

---

## 3. Job Matcher Service

- **Directory:** `ElevSkill_Frontend/ml/JobMatcher`
- **Python Runtime:** `3.11.9`
- **Required Dependencies (`requirements.txt`):** `sentence-transformers>=3.0.0`, `scikit-learn>=1.5.0`, `numpy>=1.26.0`, `fastapi>=0.115.0`, `uvicorn>=0.32.0`
- **Render Root Directory:** `ElevSkill_Frontend/ml/JobMatcher`
- **Render Build Command:** `pip install -r requirements.txt`
- **Render Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Required Environment Variables:**
  - `ALLOWED_ORIGINS=https://<your-vercel-domain>`
- **Health Endpoint:** `GET /health` (`200`, reports `status`, `model_loaded`, `model_name`, `offline_available`)
- **AI Endpoints:** `POST /match`
- **Model Files:** `models/all-MiniLM-L6-v2/`
- **Local Verification:** Verified via `pytest test_api.py -v` and live `/health` + `/match` + CORS checks.

---

## 4. Career Roadmap Service

- **Directory:** `ElevSkill_Frontend/ml/CareerRoadmap`
- **Python Runtime:** `3.11.9`
- **Required Dependencies (`requirements.txt`):** `sentence-transformers>=3.0.0`, `scikit-learn>=1.5.0`, `numpy>=1.26.0`, `fastapi>=0.115.0`, `uvicorn>=0.32.0`
- **Render Root Directory:** `ElevSkill_Frontend/ml/CareerRoadmap`
- **Render Build Command:** `pip install -r requirements.txt`
- **Render Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Required Environment Variables:**
  - `ALLOWED_ORIGINS=https://<your-vercel-domain>`
- **Health Endpoint:** `GET /health` (`200`, reports `status`, `model_loaded`, `model_name`, `offline_mode`, `engine_ready`)
- **AI Endpoints:** `POST /generate`
- **Model Files:** `models/all-MiniLM-L6-v2/`
- **Local Verification:** Verified via `pytest test_api.py -v` and live `/health` + `/generate` + CORS checks.

---

## Vercel Frontend Environment Variable Mapping

Once all four Render services are live, configure these in **Vercel → Project Settings → Environment Variables** (alongside `VITE_FIREBASE_*` and `VITE_FIREBASE_APP_CHECK_SITE_KEY`):

| Vercel Environment Variable | Render Service URL |
|---|---|
| `VITE_RESUME_ANALYZER_API_URL` | `https://<resume-analyzer-service>.onrender.com` |
| `VITE_INTERVIEW_COACH_API_URL` | `https://<interview-coach-service>.onrender.com` |
| `VITE_JOB_MATCHER_API_URL` | `https://<job-matcher-service>.onrender.com` |
| `VITE_CAREER_ROADMAP_API_URL` | `https://<career-roadmap-service>.onrender.com` |

---

## Unresolved Deployment Risks (Verified Only on Live Render)
1. **PyTorch / `all-MiniLM-L6-v2` peak RSS on Render Free tier (512 MB):** Must be checked in Render metrics on first deploy; upgrade to a higher-RAM tier if OOM occurs.
2. **Cold starts on Render Free/Starter:** First request after idle spin-down will experience model-load latency (~15–45s).
3. **Git LFS support on Render:** If `*.safetensors` (`86.65 MB` each) are pushed via Git LFS, ensure Render's Git LFS integration is enabled so model files are materialized in `models/all-MiniLM-L6-v2/` during build.
