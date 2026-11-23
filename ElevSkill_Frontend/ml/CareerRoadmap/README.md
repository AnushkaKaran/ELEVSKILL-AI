# CareerPilot AI — Phase 3F-2: Career Roadmap ML Engine

A **local, privacy-preserving, hybrid ML + Prerequisite-DAG Career Roadmap engine** for CareerPilot AI.

> **Disclaimer:** This engine provides learning-path guidance only. It does **not** predict employment probability, guarantee career outcomes, or verify actual skill proficiency.

---

## 1. Architecture: Semantic Matching vs. Deterministic Logic

1. **ML Semantic Matching (`all-MiniLM-L6-v2`, Apache-2.0, local offline):**
   - Resolves informal target-role descriptions (e.g., `"Junior Data Science Grad"`, `"ML Eng"`) to canonical roles, with explicit confidence threshold (`0.36`) and ambiguity margin (`0.04`).
   - Maps informal/paraphrased user skill phrases (e.g., `"responsive flexbox and grid styling"`) to canonical skill IDs.
2. **Knowledge-Based Prerequisite DAG & Topological Sort (Deterministic):**
   - `validate_prerequisite_graph()` checks for cycles (via Kahn's algorithm) and nonexistent skill references.
   - Orders missing skills so foundational prerequisites always precede dependent intermediate and advanced skills.
3. **Progress-Aware Sequencing (Deterministic):**
   - Keeps `known_skills`, `completed_skills`, `missing_skills`, `uncertain_skills`, `recommended_next_skills`, and `blocked_skills` strictly separate.
   - Never re-recommends completed or already-known skills and never overwrites user completion history.

---

## 2. Supported Roles & Taxonomy
- **Supported Roles (`6`):** `Frontend Developer`, `Backend Developer`, `Python Developer`, `Data Analyst`, `Data Scientist`, `Machine Learning Engineer`.
- **Taxonomy (`22` canonical skills):** Stable IDs (`html5`, `css3`, `javascript`, `git`, `python`, `sql`, `nosql`, `java`, `typescript`, `react`, `react_native`, `rest_api`, `nodejs`, `fastapi`, `testing`, `docker`, `numpy_pandas`, `data_viz`, `statistics_eda`, `machine_learning`, `deep_learning`, `ml_deployment`), each with aliases, prerequisites, tier, learning objective, approximate hours, and verified official documentation URL.
- **Provenance:** Curated development taxonomy created for CareerPilot AI (not claimed as an official industry standard).

---

## 3. Setup, Offline Model Loading & Commands

Reuses the existing Python 3.11 virtual environment (`ml/ResumeAnalyzer/.venv`) and local `all-MiniLM-L6-v2` model copied to `ml/CareerRoadmap/models/all-MiniLM-L6-v2/` (`local_files_only=True`).

```powershell
# Run 26-case evaluation suite & MiniLM vs TF-IDF comparison
Set-Location "d:\CareerPilot AI\ml\CareerRoadmap"
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" evaluate_career_roadmap.py

# Execute Jupyter Notebook end-to-end
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" -m jupyter nbconvert --to notebook --execute --inplace --ExecutePreprocessor.kernel_name=careerpilot_ml CareerRoadmap_Development.ipynb
```

---

## 4. Measured Evaluation Results (`26/26` Passed)
- **Benchmark Suite:** `26/26` passed (`0` failed) covering beginners, intermediate learners, completed-skill exclusion, role changes, incomplete profiles, informal roles/skills, disambiguation (`Java`/`JavaScript`, `NoSQL`/`SQL`, `Deep Learning`/`ML`), unsupported/ambiguous roles, and malformed inputs.
- **Model Comparison:**
  - `MiniLM (all-MiniLM-L6-v2)`: Role Accuracy `100%` (`6/6`), Skill Mapping Accuracy `100%` (`5/5`), `8.66 ms/query`
  - `TF-IDF Baseline`: Role Accuracy `50%` (`3/6`), Skill Mapping Accuracy `100%` (`5/5`), `6.20 ms/query`
- **DAG & Resource Verification:** Acyclic graph verified; cycle detection & invalid-reference detection verified; all `22` resource URLs verified as HTTPS official documentation domains.

---

## 5. Exported Artifacts (`ml/CareerRoadmap/artifacts/`)
- `skill_taxonomy.json`
- `role_requirements.json`
- `prerequisite_graph.json`
- `roadmap_config.json`
- `model_comparison.json`
- `evaluation_report.json`

---

## 6. Known Limitations
- Unsupported roles outside the 6 canonical tracks return `UNSUPPORTED_ROLE` rather than forcing an unrelated match.
- `estimated_effort` hours are approximate baseline averages, not guarantees.
- Evaluated on a curated 26-case development dataset rather than independent human evaluation.

---

## 7. FastAPI Backend Service (Phase 3F-3)

### Architecture & Model Lifecycle
- `main.py` initializes `CareerRoadmapEngine` once during FastAPI `lifespan` startup from `ml/CareerRoadmap/models/all-MiniLM-L6-v2/` with `local_files_only=True` (offline inference, no downloads).
- The engine is stored on `app.state.engine` and reused across all `/generate` requests.
- CORS is restricted to `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:5174`, and `http://127.0.0.1:5174` (`allow_credentials=False`).
- Resume text, project descriptions, stack traces, and local filesystem paths are never logged or exposed in HTTP responses.

### Start the Service (Port 8004)
```powershell
Set-Location "d:\CareerPilot AI\ml\CareerRoadmap"
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8004
```

### Run Automated API Tests
```powershell
Set-Location "d:\CareerPilot AI\ml\CareerRoadmap"
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" -m pytest -v test_api.py
```

### Endpoints
- **`GET /health`** (`200 OK`):
  ```json
  {
    "status": "ok",
    "model_loaded": true,
    "model_name": "all-MiniLM-L6-v2",
    "offline_mode": true,
    "engine_ready": true
  }
  ```
- **`POST /generate`**:
  - **Request (`application/json`):** `{ "target_role": "string", "experience_level"?, "education"?, "known_skills"?, "completed_skills"?, "project_descriptions"?, "resume_text"? }`
  - **Response (`200 OK`):** Actual `CareerRoadmapEngine.generate_roadmap(...)` output (`valid`, `target_role`, `role_resolution`, `current_skill_assessment`, `known_skills`, `completed_skills`, `missing_skills`, `uncertain_skills`, `roadmap_stages`, `recommended_next_skills`, `blocked_skills`, `prerequisite_explanations`, `learning_objectives`, `estimated_effort`, `resource_recommendations`, `personalization_explanation`, `model_used`, `limitations`).
  - **Error Handling:** `422` (Pydantic validation failure), `200` with `valid: false` (`UNSUPPORTED_ROLE` / `AMBIGUOUS_ROLE`), `503` (`MODEL_UNAVAILABLE`), `500` (`INTERNAL_ERROR`).
