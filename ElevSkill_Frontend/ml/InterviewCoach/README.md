# CareerPilot AI — Phase 3D-2: Interview Coach AI Engine

A **local, privacy-preserving, category-aware NLP Interview Coach engine** for CareerPilot AI. It evaluates written candidate responses across `behavioral`, `frontend`, `dsa`, and `general` categories without external or paid AI APIs.

---

## 1. Architecture Overview

- **Category-Aware Evaluation**:
  - **`behavioral` & `general`**: Evaluates Question Relevance (`20`), **STAR Completeness** (`30`: Situation, Task, Action, Result), Behavioral Theme Coverage (`20`), Clarity (`8`), Communication (`7`), and Practical Application (`15`).
  - **`frontend` & `dsa`**: Evaluates Question Relevance (`20`), **Conceptual Understanding** (`30`), **Completeness** (`20`), Clarity (`8`), Communication (`7`), and Practical Application (`15`).
- **Outputs**: `valid`, `category`, `overall_score`, `dimension_scores`, `star_assessment`, `covered_concepts`, `missing_concepts`, `strengths`, `improvement_suggestions`, `illustrative_example` (clearly labelled as a template, not an actual candidate response), and `diagnostics`.
- **Disclaimer**: Scores reflect transparent rubric and semantic alignment signals only — **not** predictions of interview selection or hiring probability.

---

## 2. Three-Way Model Benchmark & Selection

Benchmarked on the same 20-case PII-free curated development benchmark (`evaluate_interview_coach.py`):

| Model / Baseline | Load (s) | Avg Inference (ms/pair) | Strong Mean Sim | Paraphrased Mean Sim | Partial Mean Sim | Off-Topic Mean Sim | Strong − Off-Topic |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`all-MiniLM-L6-v2`** *(Selected)* | **0.282** | **87.48** | 0.4983 | 0.2803 | 0.5302 | **0.0644** | **0.4339** |
| `BAAI/bge-small-en-v1.5` | 11.924 | 150.75 | 0.7660 | 0.6993 | 0.7355 | 0.4585 | 0.3075 |
| `TF-IDF Baseline` | 0.000 | 10.00 | 0.1779 | 0.0000 | 0.1459 | 0.0000 | 0.1779 |

**Selection Rationale:** `all-MiniLM-L6-v2` (Apache-2.0) achieved stronger separation between strong and off-topic answers (`0.4339` vs. `0.3075`), avoided BGE's high off-topic similarity floor (`0.0644` vs. `0.4585`), loaded ~42× faster (`0.282s`), and ran ~1.7× faster per pair on CPU.

---

## 3. Dataset Provenance
- **Curated Development Benchmark (`20` cases):** PII-free synthetic/curated test cases across `behavioral`, `frontend`, `dsa`, and `general` covering `strong`, `paraphrased`, `partial`, `missing_result`, `vague`, `one_word`, `long_repetitive`, and `off_topic` tiers.
- **Note:** These are curated development/evaluation examples, **not** human-graded real interview transcripts.

---

## 4. Setup & Commands

```powershell
# 1. Run the 3-way benchmark & 20-case evaluation suite
Set-Location "d:\CareerPilot AI\ml\InterviewCoach"
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" evaluate_interview_coach.py

# 2. Execute the Jupyter Notebook end-to-end
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" -m jupyter nbconvert --to notebook --execute --inplace --ExecutePreprocessor.kernel_name=careerpilot_ml InterviewCoach_Development.ipynb
```

### Standalone Inference Example
```python
from interview_coach import evaluate_interview_answer

result = evaluate_interview_answer(
    answer_text="In React, props are read-only inputs passed from parent to child...",
    category="frontend",
    question_id="fe-1",
)
print(result["overall_score"], result["covered_concepts"], result["missing_concepts"])
```

---

## 5. Saved Model & Artifacts
- `ml/InterviewCoach/models/all-MiniLM-L6-v2/` (saved locally for offline inference)
- `ml/InterviewCoach/artifacts/evaluation_report.json`
- `ml/InterviewCoach/artifacts/question_bank.json`

---

## 6. Known Limitations & Benchmark Caveat
1. The Interview Coach model is a **semantic alignment tool**, not a factual code-correctness verifier or hiring-outcome predictor.
2. **Benchmark Caveat:** On the curated 20-case benchmark, `all-MiniLM-L6-v2` produced a partial-answer mean similarity (`0.5302`) exceeding its strong-answer mean (`0.4983`) due to short partial answers closely echoing question phrasing. Do **not** describe this as a validated interview-quality grading model.
3. Very short 1-sentence behavioral answers may not trigger explicit STAR cues even when context is implied.
4. Evaluation uses a curated 20-case benchmark rather than human-graded interview transcripts.

---

## 7. FastAPI Service (Phase 3D-3)

### Architecture & Offline Model Lifecycle
- `main.py` initializes `InterviewCoachEngine` once during FastAPI `lifespan` startup from `ml/InterviewCoach/models/all-MiniLM-L6-v2/` with `local_files_only=True` (no downloads during startup).
- The engine instance is stored on `app.state.engine` and reused across all requests.
- CORS is restricted to `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:5174`, and `http://127.0.0.1:5174`.
- Candidate answers, stack traces, and local filesystem paths are never exposed in logs or HTTP error responses.

### Start the Service (Port 8002)
```powershell
Set-Location "d:\CareerPilot AI\ml\InterviewCoach"
& "d:\CareerPilot AI\ml\ResumeAnalyzer\.venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8002
```

### Run Automated API Tests
```powershell
Set-Location "d:\CareerPilot AI\ml\InterviewCoach"
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
- **`POST /evaluate`**:
  - **Request (`application/json`):**
    ```json
    {
      "answer_text": "In React, props are read-only inputs from a parent...",
      "category": "frontend",
      "question_id": "fe-1",
      "question_text": null,
      "expected_concepts": null
    }
    ```
  - **Response (`200 OK`):** Returns `valid`, `model_used`, `category`, `overall_score`, `question_relevance_similarity`, `dimension_scores`, `star_assessment` (`null` for `frontend`/`dsa`; STAR breakdown for `behavioral`/`general`), `covered_concepts`, `missing_concepts`, `strengths`, `improvement_suggestions`, `illustrative_example`, and `diagnostics`.
  - **Error Responses:** `422` (Pydantic validation failure: empty/whitespace/overlong answer, invalid category, missing question), `503` (`MODEL_UNAVAILABLE` or `INFERENCE_UNAVAILABLE`), `500` (`INTERNAL_ERROR`).
