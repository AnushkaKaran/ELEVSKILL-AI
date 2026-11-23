"""
CareerPilot AI — Phase 3E-2: Job Matcher 3-Way Model Benchmark & Evaluation Suite
=================================================================================
Evaluates 28 curated PII-free development/test cases across:
  - Strong, Partial, Weak, Unrelated, Paraphrased, Disambiguation,
    Missing Required, Missing Preferred, Projects-Only, and Invalid inputs.

Note: These are curated development examples, NOT live job listings or human-graded hiring data.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from job_matcher import (
    DEFAULT_WEIGHTS,
    INTERVIEW_MINILM_DIR,
    JobMatcherEngine,
    RESUME_MINILM_DIR,
    SKILL_TAXONOMY,
)

BASE_DIR = Path(__file__).resolve().parent
DATASETS_DIR = BASE_DIR / "datasets"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
MODELS_DIR = BASE_DIR / "models"


def load_benchmark_cases() -> List[Dict[str, Any]]:
    path = DATASETS_DIR / "benchmark_cases.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _build_profile_blob(profile: Dict[str, Any]) -> str:
    parts = [
        str(profile.get("target_role") or ""),
        str(profile.get("experience_level") or ""),
        str(profile.get("education") or ""),
        " ".join(profile.get("skills") or []),
        " ".join(profile.get("project_descriptions") or []),
        str(profile.get("resume_text") or ""),
    ]
    return "\n".join(p for p in parts if p.strip())


def benchmark_three_models(cases: List[Dict[str, Any]]) -> Dict[str, Any]:
    eval_tiers = {"strong", "partial", "weak", "unrelated", "paraphrased"}
    eval_cases = [c for c in cases if c["tier"] in eval_tiers]

    minilm_src = (
        str(RESUME_MINILM_DIR)
        if RESUME_MINILM_DIR.exists()
        else (str(INTERVIEW_MINILM_DIR) if INTERVIEW_MINILM_DIR.exists() else "sentence-transformers/all-MiniLM-L6-v2")
    )

    model_specs = [
        ("all-MiniLM-L6-v2", minilm_src),
        ("BAAI/bge-small-en-v1.5", "BAAI/bge-small-en-v1.5"),
    ]

    comparison: Dict[str, Any] = {}

    for label, src in model_specs:
        engine = JobMatcherEngine(model_name_or_path=src)
        t0 = time.perf_counter()
        engine._get_model()
        load_sec = round(time.perf_counter() - t0, 3)

        tier_scores: Dict[str, List[float]] = {t: [] for t in eval_tiers}
        tier_sem: Dict[str, List[float]] = {t: [] for t in eval_tiers}

        t_inf = time.perf_counter()
        for c in eval_cases:
            res = engine.match(c["profile"], c["job"])
            tier_scores[c["tier"]].append(float(res["overall_match_score"]))
            tier_sem[c["tier"]].append(float(res["semantic_relevance"]))
        avg_ms = round(((time.perf_counter() - t_inf) / len(eval_cases)) * 1000, 2)

        mean_scores = {t: round(float(np.mean(v)), 2) for t, v in tier_scores.items() if v}
        mean_sem = {t: round(float(np.mean(v)), 4) for t, v in tier_sem.items() if v}
        strong_vs_unrelated = round(mean_scores["strong"] - mean_scores["unrelated"], 2)
        sem_sep = round(mean_sem["strong"] - mean_sem["unrelated"], 4)
        ranking_ok = (
            mean_scores["strong"] > mean_scores["partial"] > mean_scores["weak"] > mean_scores["unrelated"]
        )

        comparison[label] = {
            "load_seconds": load_sec,
            "avg_inference_ms_per_case": avg_ms,
            "mean_match_score_by_tier": mean_scores,
            "mean_semantic_sim_by_tier": mean_sem,
            "strong_minus_unrelated_score": strong_vs_unrelated,
            "strong_minus_unrelated_semantic": sem_sep,
            "monotonic_tier_ranking": ranking_ok,
        }

    # TF-IDF lexical baseline
    tier_lex: Dict[str, List[float]] = {t: [] for t in eval_tiers}
    t_lex = time.perf_counter()
    for c in eval_cases:
        p_txt = _build_profile_blob(c["profile"])
        j_txt = f"{c['job'].get('title', '')}\n{c['job']['description']}"
        try:
            vec = TfidfVectorizer(stop_words="english")
            mat = vec.fit_transform([p_txt, j_txt])
            sim = float(cosine_similarity(mat[0:1], mat[1:2])[0][0])
        except ValueError:
            sim = 0.0
        tier_lex[c["tier"]].append(sim)
    lex_ms = round(((time.perf_counter() - t_lex) / len(eval_cases)) * 1000, 2)
    mean_lex = {t: round(float(np.mean(v)), 4) for t, v in tier_lex.items() if v}

    comparison["TF-IDF Baseline"] = {
        "load_seconds": 0.0,
        "avg_inference_ms_per_case": lex_ms,
        "mean_semantic_sim_by_tier": mean_lex,
        "strong_minus_unrelated_semantic": round(mean_lex["strong"] - mean_lex["unrelated"], 4),
    }
    return comparison


def run_evaluation_suite(engine: JobMatcherEngine, cases: List[Dict[str, Any]]) -> Dict[str, Any]:
    results_by_id: Dict[str, Dict[str, Any]] = {}
    for c in cases:
        results_by_id[c["id"]] = engine.match(c["profile"], c["job"])

    # 1. Invalid / incomplete input assertions
    assert results_by_id["jm-27"]["valid"] is False
    assert results_by_id["jm-28"]["valid"] is False
    assert engine.match(None, {})["valid"] is False

    # 2. Boundary-aware skill disambiguation assertions
    # jm-18: JavaScript must NOT match Java
    assert "JavaScript" in results_by_id["jm-18"]["diagnostics"]["user_skills_detected"]
    assert "Java" not in results_by_id["jm-18"]["diagnostics"]["user_skills_detected"]
    assert "Java" in results_by_id["jm-18"]["missing_required_skills"]

    # jm-19: CSS3, C++, CI/CD must NOT match standalone C
    assert "C" not in results_by_id["jm-19"]["diagnostics"]["user_skills_detected"]
    assert "C" in results_by_id["jm-19"]["missing_required_skills"]

    # jm-20: React Native must NOT match React; Node.js normalizes
    assert "React Native" in results_by_id["jm-20"]["diagnostics"]["user_skills_detected"]
    assert "React" not in results_by_id["jm-20"]["diagnostics"]["user_skills_detected"]
    assert "React" in results_by_id["jm-20"]["missing_required_skills"]
    assert "Node.js" in results_by_id["jm-20"]["matched_skills"]

    # jm-21: NoSQL & Deep Learning vs SQL & Machine Learning
    assert "SQL" not in results_by_id["jm-21"]["diagnostics"]["user_skills_detected"]
    assert "Machine Learning" not in results_by_id["jm-21"]["diagnostics"]["user_skills_detected"]
    assert "SQL" in results_by_id["jm-21"]["missing_required_skills"]
    assert "Machine Learning" in results_by_id["jm-21"]["missing_required_skills"]

    # 3. Required vs preferred distinction
    assert results_by_id["jm-24"]["required_skill_coverage"] == 100.0
    assert results_by_id["jm-24"]["preferred_skill_coverage"] == 0.0
    assert "Docker" in results_by_id["jm-24"]["missing_preferred_skills"]
    assert results_by_id["jm-24"]["missing_required_skills"] == []

    # 4. Missing-information handling (jm-26 has no education & no preferred skills -> excluded cleanly)
    excluded_26 = results_by_id["jm-26"]["diagnostics"]["excluded_dimensions"]
    assert "education_qualification_alignment" in excluded_26
    assert "preferred_skill_coverage" in excluded_26
    assert results_by_id["jm-26"]["dimension_scores"]["education_qualification_alignment"]["score_percent"] is None

    # 5. Score sensitivity when adding missing required skill (jm-23 + Docker)
    jm23_before = results_by_id["jm-23"]["overall_match_score"]
    jm23_with_docker = engine.match(
        {
            **cases[22]["profile"],
            "skills": [*cases[22]["profile"]["skills"], "Docker"],
        },
        cases[22]["job"],
    )
    assert jm23_with_docker["overall_match_score"] > jm23_before

    # 6. Evidence traceability (every evidence string must come from user's supplied text)
    for cid in ["jm-01", "jm-02", "jm-26"]:
        prof_blob = _build_profile_blob(next(c["profile"] for c in cases if c["id"] == cid))
        for ev in results_by_id[cid]["relevant_profile_evidence"]:
            assert ev["text"] in prof_blob

    # 7. Repeated inference & model reuse
    model_id_before = id(engine._model)
    _ = engine.match(cases[0]["profile"], cases[0]["job"])
    assert id(engine._model) == model_id_before

    return {
        "total_cases": len(cases),
        "all_assertions_passed": True,
        "sensitivity_check_jm23": {
            "without_docker_score": jm23_before,
            "with_docker_score": jm23_with_docker["overall_match_score"],
        },
        "case_summaries": [
            {
                "id": c["id"],
                "tier": c["tier"],
                "valid": results_by_id[c["id"]]["valid"],
                "overall_match_score": results_by_id[c["id"]].get("overall_match_score", 0),
                "semantic_relevance": results_by_id[c["id"]].get("semantic_relevance"),
                "required_skill_coverage": results_by_id[c["id"]].get("required_skill_coverage"),
                "preferred_skill_coverage": results_by_id[c["id"]].get("preferred_skill_coverage"),
            }
            for c in cases
        ],
    }


if __name__ == "__main__":
    cases = load_benchmark_cases()
    model_comp = benchmark_three_models(cases)

    # Select winner based on semantic tier separation + monotonic ranking + latency
    mini = model_comp["all-MiniLM-L6-v2"]
    bge = model_comp["BAAI/bge-small-en-v1.5"]
    selected = (
        "all-MiniLM-L6-v2"
        if mini["strong_minus_unrelated_semantic"] >= bge["strong_minus_unrelated_semantic"]
        else "BAAI/bge-small-en-v1.5"
    )

    chosen_src = (
        str(RESUME_MINILM_DIR)
        if selected == "all-MiniLM-L6-v2" and RESUME_MINILM_DIR.exists()
        else ("BAAI/bge-small-en-v1.5" if selected == "BAAI/bge-small-en-v1.5" else "sentence-transformers/all-MiniLM-L6-v2")
    )
    engine = JobMatcherEngine(model_name_or_path=chosen_src)
    eval_report = run_evaluation_suite(engine, cases)

    # Save selected model locally to ml/JobMatcher/models/
    save_dir = MODELS_DIR / selected
    save_dir.mkdir(parents=True, exist_ok=True)
    engine._get_model().save(str(save_dir))

    # Verify offline reload from ml/JobMatcher/models/
    offline_engine = JobMatcherEngine(model_name_or_path=str(save_dir))
    offline_check = offline_engine.match(cases[0]["profile"], cases[0]["job"])
    assert offline_check["valid"] is True

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    (ARTIFACTS_DIR / "model_comparison.json").write_text(json.dumps(model_comp, indent=2), encoding="utf-8")
    (ARTIFACTS_DIR / "evaluation_report.json").write_text(json.dumps(eval_report, indent=2), encoding="utf-8")
    (ARTIFACTS_DIR / "skill_taxonomy.json").write_text(json.dumps(SKILL_TAXONOMY, indent=2), encoding="utf-8")
    (ARTIFACTS_DIR / "scoring_config.json").write_text(json.dumps(DEFAULT_WEIGHTS, indent=2), encoding="utf-8")

    print(json.dumps({"selected_model": selected, "model_comparison": model_comp, "sensitivity": eval_report["sensitivity_check_jm23"]}, indent=2))
