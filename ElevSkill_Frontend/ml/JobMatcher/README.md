# CareerPilot AI — Phase 3E-2: Job Matcher NLP/ML Engine

A **local, privacy-preserving, 5-dimensional Job Matcher NLP/ML engine** for CareerPilot AI. It compares a user's actual profile, skills, education, and project descriptions against a supplied job description without external APIs, cloud inference, or fabricated job-market data.

---

## 1. Architecture Overview
1. **Boundary-Aware, Disambiguated Skill Extractor (`extract_skills`)**:
   - Prevents substring false positives across `Java` vs `JavaScript`, `C` vs `C++`/`CSS3`/`CI/CD`, `React` vs `React Native`, `Node` vs `Node.js`, `SQL` vs `NoSQL`/`MySQL`/`PostgreSQL`/`SQLite`, and `Machine Learning` vs `Deep Learning`.
2. **Job Requirement Classifier (`_parse_job_requirements`)**:
   - Classifies JD skills into `required_skills`, `preferred_skills`, and `uncertain_skills`.
3. **5-Dimensional Configurable Scoring (`DEFAULT_WEIGHTS`)**:
   - `required_skill_coverage` (`35%`), `semantic_relevance` (`30%`), `project_experience_alignment` (`15%`), `preferred_skill_coverage` (`10%`), `education_qualification_alignment` (`10%`).
   - Normalizes strictly over **applicable** dimensions—never silently awarding positive points for missing profile or JD fields.
4. **Traceable Evidence Retrieval (`_extract_profile_evidence`)**:
   - Returns top matching sentences/bullets directly from user-supplied `project_descriptions` and `resume_text`.

---

## 2. Three-Way Model Benchmark & Selection
Benchmarked on `28` curated PII-free development/test cases (`datasets/benchmark_cases.json`):

| Model / Baseline | Avg Latency (ms/case) | Strong Score / Sim | Partial Score / Sim | Weak Score / Sim | Unrelated Score / Sim | Paraphrased Score / Sim | Monotonic Ranking |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`all-MiniLM-L6-v2`** *(Selected)* | **77.73** | **89.75** / 0.7572 | 39.0 / 0.4198 | 0.67 / 0.0968 | **0.0** / **0.0253** | 85.67 / 0.6467 | **Yes** |
| `BAAI/bge-small-en-v1.5` | 161.01 | 94.0 / 0.8106 | 62.0 / 0.6666 | 41.33 / 0.5472 | 58.67 / 0.4696 | 92.33 / 0.7229 | No (`unrelated > weak`) |
| `TF-IDF Baseline` | 7.35 | — / 0.4210 | — / 0.1352 | — / 0.0000 | — / 0.0000 | — / 0.1307 | — |

**Selection Rationale:** `all-MiniLM-L6-v2` achieved clean monotonic ranking across all tiers, `89.75` points of separation between Strong (`89.75`) and Unrelated (`0.0`) matches, strong paraphrase handling (`85.67`), and `2.1×` faster CPU inference (`77.73 ms/case`).

---

## 3. Commands & Offline Inference

```powershell
# Run 3-way benchmark & 28-case evaluation suite
Set-Location "d:\CareerPilot AI\ml\JobMatcher"
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" evaluate_job_matcher.py

# Execute Jupyter Notebook end-to-end
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" -m jupyter nbconvert --to notebook --execute --inplace --ExecutePreprocessor.kernel_name=careerpilot_ml JobMatcher_Development.ipynb
```

```python
from job_matcher import match_job_to_profile

result = match_job_to_profile(
    profile={"skills": ["Python", "FastAPI", "PostgreSQL"], "project_descriptions": ["Built FastAPI endpoints with PostgreSQL."]},
    job={"title": "Backend Developer", "description": "Requirements:\n- Python, FastAPI, PostgreSQL, and Docker."},
)
print(result["overall_match_score"], result["missing_required_skills"])
```

---

## 4. Saved Model & Artifacts
- `ml/JobMatcher/models/all-MiniLM-L6-v2/`
- `ml/JobMatcher/datasets/benchmark_cases.json` (curated development/test data, **not** live job listings)
- `ml/JobMatcher/artifacts/evaluation_report.json`
- `ml/JobMatcher/artifacts/model_comparison.json`
- `ml/JobMatcher/artifacts/skill_taxonomy.json`
- `ml/JobMatcher/artifacts/scoring_config.json`

---

## 5. Known Limitations
- Reflects local profile-to-JD alignment only; does **not** predict hiring probability, verify years of experience, or provide live job-market data.
- Unstructured job descriptions without `Preferred`/`Bonus` headings classify detected skills as required/uncertain.
- Curated benchmark validates ranking and edge-case logic rather than real-world recruiter decisions.

---

## 6. FastAPI Service (Phase 3E-3)

### Architecture & Offline Model Lifecycle
- `main.py` initializes `JobMatcherEngine` once during FastAPI `lifespan` startup from `ml/JobMatcher/models/all-MiniLM-L6-v2/` with `local_files_only=True` (no downloads during startup).
- The engine instance is stored on `app.state.engine` and reused across all requests.
- CORS is restricted to `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:5174`, and `http://127.0.0.1:5174`.
- Candidate profiles, job descriptions, stack traces, and local filesystem paths are never exposed in logs or HTTP error responses.

### Start the Service (Port 8003)
```powershell
Set-Location "d:\CareerPilot AI\ml\JobMatcher"
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8003
```

### Run Automated API Tests
```powershell
Set-Location "d:\CareerPilot AI\ml\JobMatcher"
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" -m pytest -v test_api.py
```

### Endpoints
- **`GET /health`** (`200 OK`):
  ```json
  {
    "status": "ok",
    "model_loaded": true,
    "model_name": "all-MiniLM-L6-v2",
    "offline_available": true
  }
  ```
- **`POST /match`**:
  - **Request (`application/json`):** `{ "profile": { "resume_text"?, "skills"?, "project_descriptions"?, "education"?, "target_role"?, "experience_level"? }, "job": { "title"?, "company"?, "description", "required_skills"?, "preferred_skills"? } }`
  - **Response (`200 OK`):** Actual `JobMatcherEngine.match(...)` output (`valid`, `overall_match_score`, `dimension_scores`, `semantic_relevance`, `required_skill_coverage`, `preferred_skill_coverage`, `matched_skills`, `missing_required_skills`, `missing_preferred_skills`, `relevant_profile_evidence`, `strengths`, `improvement_suggestions`, `match_explanation`, `model_used`, `limitations`, `diagnostics`).
  - **Error Responses:** `422` (Pydantic validation failure), `503` (`MODEL_UNAVAILABLE` or `INFERENCE_UNAVAILABLE`), `500` (`INTERNAL_ERROR`).
