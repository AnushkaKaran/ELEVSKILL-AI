# ELEVSKILL AI

ELEVSKILL AI is a full-stack career intelligence and skill-development platform combining a React + Vite web application, a Node.js + Express.js REST API, Microsoft SQL Server persistence, four dedicated Python FastAPI NLP/ML microservices, and optional Firebase AI Logic hybrid (on-device + cloud) assistance.

---

## Main Features

- **Resume Analyzer (`8000`)**: PDF/text parsing, section diagnostics, categorized technical skill extraction, writing-quality feedback, and semantic job-description alignment.
- **Resume Vault & Builder**: Secure PDF upload and persistence for signed-in users, plus structured resume building and export.
- **Interview Coach (`8002`)**: Role-based technical/behavioral interview practice with semantic answer evaluation and actionable feedback.
- **Job Matcher (`8003`)**: Semantic + skill-gap matching between candidate resumes/profiles and target job descriptions.
- **Career Roadmap (`8004`)**: Canonical role resolution, prerequisite-DAG skill sequencing, known/completed/missing skill tracking, and curated official learning resources.
- **Hybrid AI Quick Assistant**: Optional Chrome on-device Gemini Nano (`PREFER_ON_DEVICE`) with Firebase AI Logic cloud fallback (`gemini-3.5-flash-lite`) protected by Firebase App Check.
- **Guest & Authenticated Modes**: Instant guest exploration via origin-scoped browser storage, or full persistent workspaces backed by SQL Server and JWT authentication.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, Lucide React, Firebase Web SDK (AI Logic + App Check) |
| **Backend API** | Node.js, Express.js (ES Modules, JavaScript), `mssql` + `msnodesqlv8` / `tedious`, JWT, `bcrypt`, `multer`, `helmet`, `express-rate-limit` |
| **Database** | Microsoft SQL Server 2022 Express (`ELEVSKILL_AI_DB`) |
| **AI Microservices** | Python 3.11, FastAPI, Uvicorn, `sentence-transformers` (`all-MiniLM-L6-v2`), `scikit-learn`, `numpy`, `pypdf` |
| **Local Orchestration** | PowerShell (`start_elevskill.ps1`) with pre-flight checks, health polling, and clean process-tree shutdown |

---

## Architecture Overview

```text
React + Vite Frontend (5173)
   ├── Signed-in API calls ──▶ Express Backend (5000) ──▶ SQL Server 2022 Express (ELEVSKILL_AI_DB)
   │                                  │
   │                                  ├──▶ Resume Analyzer  (FastAPI :8000)
   │                                  ├──▶ Interview Coach  (FastAPI :8002)
   │                                  ├──▶ Job Matcher      (FastAPI :8003)
   │                                  └──▶ Career Roadmap   (FastAPI :8004)
   │
   └── Guest-mode AI calls ───────────┴──▶ FastAPI Services (:8000, :8002, :8003, :8004)
   └── Hybrid Quick Assistant ───────────▶ Firebase AI Logic (On-Device / Cloud Fallback)
```

---

## Project Folder Structure

```text
ELEVSKILLS/
├── start_elevskill.ps1            # Unified local startup orchestrator (Windows)
├── package.json                   # Root convenience scripts (`npm start` / `npm run dev`)
├── .gitignore                     # Root exclusions (logs, .env, .venv, uploads)
├── ElevSkill_Backend/
│   ├── server.js                  # Express entry point (port 5000)
│   ├── database/
│   │   ├── migrate.js             # SQL Server database & migration runner
│   │   └── migrations/            # SQL schema migrations (001_initial_schema.sql)
│   ├── src/
│   │   ├── app.js                 # Express app, CORS, helmet, rate limiting, /api/health
│   │   ├── config/                # Environment, SQL Server pool, AI service URLs
│   │   ├── controllers/           # Route handlers
│   │   ├── middleware/            # Auth, validation, error handling, PDF upload
│   │   ├── routes/                # REST API routes
│   │   └── services/              # Business logic & SQL queries
│   ├── storage/                   # Uploaded PDF vault & temporary upload dirs (.gitkeep)
│   └── tests/                     # Vitest integration tests
└── ElevSkill_Frontend/
    ├── index.html
    ├── vite.config.js
    ├── src/
    │   ├── App.jsx                # Root app shell, routing, auth & guest workspace
    │   ├── components/            # Reusable UI, OnboardingModal, AuthModal, HybridAiTipCard
    │   ├── config/                # Firebase & App Check setup
    │   ├── pages/                 # Dashboard, ResumeAnalyzer, ResumeVault, ResumeBuilder, InterviewCoach, JobMatcher, CareerRoadmap, Settings
    │   ├── services/              # Backend & FastAPI clients + Firebase AI service
    │   └── utils/                 # Local storage & progress helpers
    └── ml/
        ├── ResumeAnalyzer/        # FastAPI service (:8000) + all-MiniLM-L6-v2
        ├── InterviewCoach/        # FastAPI service (:8002) + all-MiniLM-L6-v2
        ├── JobMatcher/            # FastAPI service (:8003) + all-MiniLM-L6-v2
        └── CareerRoadmap/         # FastAPI service (:8004) + all-MiniLM-L6-v2
```

---

## Prerequisites

- **Node.js** `>= 22` (tested on `v26.13.1` with `msnodesqlv8@^6.2.2`)
- **Python** `3.11` with shared virtual environment at `ElevSkill_Frontend/ml/ResumeAnalyzer/.venv`
- **Microsoft SQL Server 2022 Express** (`.\SQLEXPRESS`) + **ODBC Driver 17 for SQL Server** (for local Windows Integrated Authentication)

---

## Local Installation & Startup

### 1. Install Dependencies
```powershell
# Backend
cd D:\ELEVSKILLS\ElevSkill_Backend
npm.cmd install

# Frontend
cd D:\ELEVSKILLS\ElevSkill_Frontend
npm.cmd install
```

Ensure the shared Python virtual environment at `ElevSkill_Frontend/ml/ResumeAnalyzer/.venv` has dependencies from each `ml/<Service>/requirements.txt` installed.

### 2. Configure Environment Variables

Copy the example files and fill in your local values (never commit `.env` or `.env.local`):

- **Backend (`ElevSkill_Backend/.env` from `ElevSkill_Backend/.env.example`):**
  - `PORT=5000`, `NODE_ENV=development`, `FRONTEND_URL=http://localhost:5173`
  - `SQL_SERVER=.\SQLEXPRESS`, `SQL_DATABASE=ELEVSKILL_AI_DB`, `SQL_TRUSTED_CONNECTION=true`, `SQL_ODBC_DRIVER=ODBC Driver 17 for SQL Server`
  - `JWT_SECRET=<your_secret>`, `JWT_EXPIRES_IN=7d`
  - `RESUME_ANALYZER_URL=http://127.0.0.1:8000`, `INTERVIEW_COACH_URL=http://127.0.0.1:8002`, `JOB_MATCHER_URL=http://127.0.0.1:8003`, `CAREER_ROADMAP_URL=http://127.0.0.1:8004`
- **Frontend (`ElevSkill_Frontend/.env.local` from `ElevSkill_Frontend/.env.example`):**
  - `VITE_API_BASE_URL=http://localhost:5000/api`
  - `VITE_RESUME_ANALYZER_API_URL=http://127.0.0.1:8000` (plus `8002`, `8003`, `8004`)
  - `VITE_FIREBASE_*` (Firebase Web App config, App Check site key / debug token, and `VITE_FIREBASE_AI_CLOUD_MODEL=gemini-3.5-flash-lite`)

### 3. Database Setup & Migration

Ensure `MSSQL$SQLEXPRESS` is running, then run:

```powershell
cd D:\ELEVSKILLS\ElevSkill_Backend
npm.cmd run migrate
```

This creates `ELEVSKILL_AI_DB` if missing and applies `database/migrations/001_initial_schema.sql`.

### 4. Start All Services (One Command)

From the project root (`D:\ELEVSKILLS`):

```powershell
.\start_elevskill.ps1
```
*(or `npm.cmd start`)*

The orchestrator verifies SQL Server and free ports, starts all 4 FastAPI services, the Express backend, and the Vite dev server, polls all `/health` and `/api/health` endpoints until ready, logs per-service output to `logs/`, and shuts down all orchestrator-owned processes cleanly on `Ctrl+C`.

---

## AI Services

| Service | Port | Health Endpoint | Model |
|---|---|---|---|
| **Resume Analyzer** | `8000` | `GET /health` | Local `all-MiniLM-L6-v2` |
| **Interview Coach** | `8002` | `GET /health` | Local `all-MiniLM-L6-v2` |
| **Job Matcher** | `8003` | `GET /health` | Local `all-MiniLM-L6-v2` |
| **Career Roadmap** | `8004` | `GET /health` | Local `all-MiniLM-L6-v2` |

---

## Deployment Architecture

- **Frontend:** Vercel (`ElevSkill_Frontend`, `vite build`, configured with production `VITE_*` URLs and Firebase App Check reCAPTCHA v3).
- **Backend:** Render Web Service (`ElevSkill_Backend`, `npm start`, pure-JS `tedious` SQL Server mode via `SQL_TRUSTED_CONNECTION=false`, Persistent Disk mounted for `storage/resumes`).
- **AI Services:** Four independent Render Python Web Services (`uvicorn main:app --host 0.0.0.0 --port $PORT`).
- **Database:** Production-accessible Microsoft SQL Server (`ELEVSKILL_AI_DB`) with SQL Authentication.

---

## Screenshots

- `[Screenshot Placeholder — Dashboard Overview]`
- `[Screenshot Placeholder — Resume Analyzer & Score Breakdown]`
- `[Screenshot Placeholder — Career Roadmap & Skills Checklist]`
- `[Screenshot Placeholder — Interview Coach & Job Matcher]`

---

## Future Improvements

- Configurable `ALLOWED_ORIGINS` environment variable on all four FastAPI services for Vercel guest-mode CORS.
- External object storage (e.g., S3 / R2) for Resume Vault PDFs in cloud deployments.
- Automated CI/CD pipeline running Vitest, Pytest, and Vite production builds on pull requests.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
