# CareerPilot AI — Phase 3A: Resume Analyzer AI/NLP Engine

This module implements a **local, privacy-preserving hybrid NLP Resume Analyzer** for CareerPilot AI. It runs completely locally without sending resume content to external or paid AI APIs.

---

## 1. Architecture Overview

1. **Structural Section Parser (`_extract_sections` & `_detect_contact_info`)**:
   - Detects contact channels (email, phone, LinkedIn/GitHub links) as booleans only—never logging or returning raw PII.
   - Parses `education`, `experience`, `projects`, `skills`, and `certifications` sections, distinguishing `present`, `incomplete`, and `missing` sections.
2. **Categorized Skill Extractor (`extract_skills`)**:
   - Extracts normalized skills across `languages`, `frameworks`, `databases`, and `tools` using alias mapping (e.g., `js` → `JavaScript`, `k8s` → `Kubernetes`).
   - Compares resume skills against job description skills to identify `matched_skills` and `missing_job_skills`.
3. **Semantic Relevance Engine (`_compute_semantic_relevance`)**:
   - Uses **`sentence-transformers/all-MiniLM-L6-v2`** (Apache-2.0 license, 384-dim embeddings, ~87 MB `model.safetensors`) to compute semantic cosine similarity between:
     - Full resume (chunked and mean-pooled for long resumes) vs. job description.
     - Individual resume sections vs. job description, with human-readable relevance explanations.
   - Also computes a **TF-IDF lexical baseline** (`scikit-learn`) for transparent comparison.
4. **Writing Quality Diagnostics (`_analyze_quality`)**:
   - Flags vague/passive bullet starters (`worked on`, `helped with`, `responsible for`), missing quantified achievements, and repeated opening verbs.
5. **Transparent Weighted Scoring (`overall_score` 0–100)**:
   - Weighted rubric across Structure, Technical Skills, Semantic Relevance (when JD is supplied), and Quality.
   - **Note:** Scores reflect structural and semantic alignment criteria only and are **not** predictions of hiring outcomes.

---

## 2. Python Environment Setup & Model Download

```powershell
# 1. Create virtual environment inside ml/ResumeAnalyzer
python -m venv "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv"

# 2. Install dependencies
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" -m pip install -r "d:\CareerPilot AI\ml\ResumeAnalyzer\requirements.txt"
```

- **Model Download**: On first run (when `ml/ResumeAnalyzer/models/all-MiniLM-L6-v2/` does not yet exist), `SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")` downloads the pretrained Apache-2.0 model from HuggingFace Hub. Once saved to `ml/ResumeAnalyzer/models/all-MiniLM-L6-v2/`, all subsequent inference runs offline from local disk.

---

## 3. Running Evaluation, Notebook & Standalone Python

### Run Evaluation Suite
```powershell
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" "d:\CareerPilot AI\ml\ResumeAnalyzer\evaluate_resume_analyzer.py"
```

### Execute Jupyter Notebook End-to-End
```powershell
Set-Location "d:\CareerPilot AI\ml\ResumeAnalyzer"
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" -m ipykernel install --user --name=careerpilot_ml --display-name="Python (CareerPilot ML)"
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" -m jupyter nbconvert --to notebook --execute --inplace --ExecutePreprocessor.kernel_name=careerpilot_ml "ResumeAnalyzer_Development.ipynb"
```

### Standalone Python Usage
```python
from resume_analyzer import analyze_resume

result = analyze_resume(
    resume_text="Education: B.S. CS\nSkills: Python, React, SQL\nExperience:\n- Built React UIs and REST APIs.",
    job_description="Junior Frontend Developer: React, JavaScript, REST APIs, Git."
)
print(result["overall_score"], result["semantic_relevance"])
```

---

## 4. Model & Artifact Locations

- **Local Model**: `ml/ResumeAnalyzer/models/all-MiniLM-L6-v2/` (`model.safetensors`: 90,864,192 bytes; `tokenizer.json`: 711,649 bytes; configs)
- **Exported Artifacts**:
  - `ml/ResumeAnalyzer/artifacts/evaluation_report.json` (3,367 bytes)
  - `ml/ResumeAnalyzer/artifacts/skill_taxonomy.json` (3,350 bytes)

---

## 5. Actual Measured Test Results

- **Evaluation Suite (`evaluate_resume_analyzer.py`)**: 8/8 functional test cases passed:
  - `1_empty_resume`: `valid=False`, `overall_score=0`
  - `2_very_short_resume`: `valid=True`, `overall_score=12`, `detected_skills_count=1`
  - `3_missing_sections_resume`: `valid=True`, `overall_score=30`, `missing_sections=["education", "experience", "projects", "certifications"]`
  - `4_multi_skill_resume`: `valid=True`, `overall_score=76`, `detected_skills_count=12`
  - `5_projects_and_education_resume`: `valid=True`, `overall_score=73`, `detected_skills_count=8`
  - `6_matched_job_description`: `valid=True`, `overall_score=90`, `semantic_similarity=0.8373`, `lexical_tfidf_similarity=0.313`
  - `7_unrelated_job_description`: `valid=True`, `overall_score=43`, `semantic_similarity=0.2522`, `lexical_tfidf_similarity=0.0`
  - `8_unusual_formatting_and_repetition`: `valid=True`, `overall_score=44`, `weak_bullets_count=4`, `repeated_openers=[{"word": "worked", "count": 4}]`
- **Standalone Offline Inference (from `models/all-MiniLM-L6-v2` against Frontend JD)**:
  - Closely related: `score=64`, `semantic_sim=0.8128`, `lexical_sim=0.4222`
  - Paraphrased (different wording, similar meaning): `score=26`, `semantic_sim=0.4388`, `lexical_sim=0.0`
  - Partial overlap: `score=43`, `semantic_sim=0.5875`, `lexical_sim=0.1783`
  - Unrelated (pastry chef): `score=7`, `semantic_sim=0.1548`, `lexical_sim=0.0`

---

## 6. Known Limitations

1. **Line-based Section Parsing**: Multi-column PDF text extraction with scrambled line ordering can reduce section header detection accuracy.
2. **Curated Skill Taxonomy**: Emerging or domain-specific tools outside `SKILL_TAXONOMY` are not categorized unless added to the taxonomy.
3. **No Supervised Ground-Truth Grading Dataset**: Scores measure transparent structural, skill, quality, and semantic alignment criteria rather than predicting hiring probability.

---

## 7. FastAPI Backend Service (Phase 3B)

### Environment Activation & Startup
```powershell
# Activate virtual environment
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\Activate.ps1"

# Install dependencies (includes fastapi, uvicorn, pytest)
pip install -r "d:\CareerPilot AI\ml\ResumeAnalyzer\requirements.txt"

# Start the FastAPI server from ml/ResumeAnalyzer
Set-Location "d:\CareerPilot AI\ml\ResumeAnalyzer"
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### Automated API Tests
```powershell
Set-Location "d:\CareerPilot AI\ml\ResumeAnalyzer"
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" -m pytest -v test_api.py
```

### API Contract (Ready for Phase 3C React Integration)
- **Base URL:** `http://127.0.0.1:8000`
- **CORS Allowed Origins:** `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:5174`, `http://127.0.0.1:5174`
- **`GET /health`**:
  - Response (`200 OK`): `{ "status": "ok", "model_loaded": true, "model_source": "D:\\CareerPilot AI\\ml\\ResumeAnalyzer\\models\\all-MiniLM-L6-v2" }`
- **`POST /analyze`**:
  - Request (`application/json`):
    ```json
    {
      "resume_text": "string (1 to 25,000 chars, non-whitespace)",
      "job_description": "string | null (optional, up to 12,000 chars)"
    }
    ```
  - Response (`200 OK`): Exact structured dictionary from `ResumeAnalyzerEngine.analyze(...)` (`valid`, `model_used`, `overall_score`, `score_breakdown`, `contact_info`, `section_assessment`, `missing_sections`, `skills_analysis`, `semantic_relevance`, `quality_analysis`, `strengths`, `areas_for_improvement`, `recommendations`, `warnings`).
  - Error Responses: `422` (Pydantic validation failure), `400` (`INVALID_INPUT`), `503` (`MODEL_UNAVAILABLE`), `500` (`INTERNAL_ERROR`, no stack trace exposed).
