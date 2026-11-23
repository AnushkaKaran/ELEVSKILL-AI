"""
CareerPilot AI — Phase 3F-2: Career Roadmap Evaluation Suite
============================================================
Evaluates:
  1. Role resolution accuracy (MiniLM vs TF-IDF baseline)
  2. Skill alias normalization & disambiguation
  3. Prerequisite DAG acyclicity, cycle detection, and invalid reference detection
  4. Topological ordering, completed/known exclusion, zero duplicates
  5. Role-change preservation, missing-profile handling, unsupported/ambiguous roles
  6. Resource URL validation (official docs only)
  7. Repeated inference reuse & offline inference
"""

from __future__ import annotations

import copy
import json
import time
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import urlparse

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from career_roadmap import (
    CareerRoadmapEngine,
    DEFAULT_AMBIGUITY_MARGIN,
    DEFAULT_ROLE_THRESHOLD,
    DEFAULT_SKILL_THRESHOLD,
    ROLE_REQUIREMENTS,
    SKILL_TAXONOMY,
    validate_prerequisite_graph,
)

BASE_DIR = Path(__file__).resolve().parent
DATASETS_DIR = BASE_DIR / "datasets"
ARTIFACTS_DIR = BASE_DIR / "artifacts"

ALLOWED_OFFICIAL_DOMAINS = {
    "developer.mozilla.org",
    "git-scm.com",
    "docs.python.org",
    "www.postgresql.org",
    "www.mongodb.com",
    "docs.oracle.com",
    "www.typescriptlang.org",
    "react.dev",
    "reactnative.dev",
    "nodejs.org",
    "fastapi.tiangolo.com",
    "docs.pytest.org",
    "docs.docker.com",
    "pandas.pydata.org",
    "matplotlib.org",
    "docs.scipy.org",
    "scikit-learn.org",
    "pytorch.org",
}


def load_benchmark_cases() -> List[Dict[str, Any]]:
    return json.loads((DATASETS_DIR / "benchmark_cases.json").read_text(encoding="utf-8"))


def compare_minilm_vs_tfidf(engine: CareerRoadmapEngine) -> Dict[str, Any]:
    role_prompts = [
        ("Junior Data Science Grad", "Data Scientist"),
        ("ML Eng", "Machine Learning Engineer"),
        ("Frontend React Developer", "Frontend Developer"),
        ("Entry Level Data Analytics", "Data Analyst"),
        ("Python Web API Programmer", "Python Developer"),
        ("Server Side API Engineer", "Backend Developer"),
    ]
    skill_prompts = [
        ("responsive flexbox and grid styling", "css3"),
        ("version control with branches", "git"),
        ("exploratory data analysis", "statistics_eda"),
        ("supervised learning models", "machine_learning"),
        ("containerization", "docker"),
    ]

    role_names = list(ROLE_REQUIREMENTS.keys())
    role_texts = [f"{r}: {ROLE_REQUIREMENTS[r]['description']}" for r in role_names]

    # MiniLM role accuracy
    t0 = time.perf_counter()
    minilm_role_hits = sum(
        1 for raw, expected in role_prompts
        if engine.resolve_role(raw)["canonical_role"] == expected
    )
    minilm_skill_hits = sum(
        1 for raw, expected_id in skill_prompts
        if expected_id in engine.map_skills([raw])[0]
    )
    minilm_ms = round(((time.perf_counter() - t0) / (len(role_prompts) + len(skill_prompts))) * 1000, 2)

    # TF-IDF baseline
    t1 = time.perf_counter()
    vec_r = TfidfVectorizer(stop_words="english")
    mat_r = vec_r.fit_transform(role_texts)
    tfidf_role_hits = 0
    for raw, expected in role_prompts:
        q = vec_r.transform([raw])
        sims = cosine_similarity(q, mat_r)[0]
        best = role_names[int(np.argmax(sims))] if float(np.max(sims)) > 0 else None
        if best == expected:
            tfidf_role_hits += 1

    skill_ids = list(SKILL_TAXONOMY.keys())
    skill_texts = [
        f"{SKILL_TAXONOMY[s]['name']} {' '.join(SKILL_TAXONOMY[s].get('aliases', []))}"
        for s in skill_ids
    ]
    vec_s = TfidfVectorizer(stop_words="english")
    mat_s = vec_s.fit_transform(skill_texts)
    tfidf_skill_hits = 0
    for raw, expected_id in skill_prompts:
        q = vec_s.transform([raw])
        sims = cosine_similarity(q, mat_s)[0]
        best = skill_ids[int(np.argmax(sims))] if float(np.max(sims)) > 0 else None
        if best == expected_id:
            tfidf_skill_hits += 1
    tfidf_ms = round(((time.perf_counter() - t1) / (len(role_prompts) + len(skill_prompts))) * 1000, 2)

    return {
        "MiniLM (all-MiniLM-L6-v2)": {
            "role_accuracy": round(minilm_role_hits / len(role_prompts), 4),
            "role_hits": f"{minilm_role_hits}/{len(role_prompts)}",
            "skill_accuracy": round(minilm_skill_hits / len(skill_prompts), 4),
            "skill_hits": f"{minilm_skill_hits}/{len(skill_prompts)}",
            "avg_ms_per_query": minilm_ms,
        },
        "TF-IDF Baseline": {
            "role_accuracy": round(tfidf_role_hits / len(role_prompts), 4),
            "role_hits": f"{tfidf_role_hits}/{len(role_prompts)}",
            "skill_accuracy": round(tfidf_skill_hits / len(skill_prompts), 4),
            "skill_hits": f"{tfidf_skill_hits}/{len(skill_prompts)}",
            "avg_ms_per_query": tfidf_ms,
        },
    }


def run_evaluation() -> Dict[str, Any]:
    t_start = time.perf_counter()
    engine = CareerRoadmapEngine()
    cases = load_benchmark_cases()

    # 1. Prerequisite DAG validation (valid, cyclic, invalid reference)
    ok, err = validate_prerequisite_graph(SKILL_TAXONOMY, ROLE_REQUIREMENTS)
    assert ok is True and err is None

    cyclic_tax = copy.deepcopy(SKILL_TAXONOMY)
    cyclic_tax["html5"]["prerequisites"] = ["react"]  # html5 -> css3/js -> react -> html5 cycle
    ok_cyc, err_cyc = validate_prerequisite_graph(cyclic_tax, ROLE_REQUIREMENTS)
    assert ok_cyc is False and "cycle" in err_cyc.lower()

    badref_tax = copy.deepcopy(SKILL_TAXONOMY)
    badref_tax["html5"]["prerequisites"] = ["nonexistent_skill_xyz"]
    ok_ref, err_ref = validate_prerequisite_graph(badref_tax, ROLE_REQUIREMENTS)
    assert ok_ref is False and "nonexistent" in err_ref.lower()

    # 2. Resource URL validation (all official & allowed domains)
    for sid, meta in SKILL_TAXONOMY.items():
        url = meta["official_resource"]["url"]
        parsed = urlparse(url)
        assert parsed.scheme == "https", f"Non-HTTPS URL for {sid}"
        assert parsed.netloc in ALLOWED_OFFICIAL_DOMAINS, f"Unverified domain {parsed.netloc}"

    # 3. Execute all 26 benchmark scenarios & verify invariants
    results_by_id: Dict[str, Dict[str, Any]] = {}
    passed = 0
    failed = 0
    failures: List[Dict[str, str]] = []

    for tc in cases:
        res = engine.generate_roadmap(
            target_role=tc["target_role"],
            known_skills=tc.get("known_skills"),
            completed_skills=tc.get("completed_skills"),
            project_descriptions=tc.get("project_descriptions"),
            resume_text=tc.get("resume_text"),
        )
        results_by_id[tc["id"]] = res

        try:
            assert res["valid"] is tc["expected_valid"], f"Expected valid={tc['expected_valid']}"
            if tc["expected_valid"]:
                assert res["target_role"] == tc["expected_canonical_role"], (
                    f"Expected {tc['expected_canonical_role']}, got {res['target_role']}"
                )
                # Zero completed/known skills in missing or recommended
                satisfied = set(res["known_skills"]) | set(res["completed_skills"])
                assert not (satisfied & set(res["missing_skills"])), "Satisfied skill in missing_skills"
                rec_names = [item["skill"] for item in res["recommended_next_skills"]]
                assert not (satisfied & set(rec_names)), "Satisfied skill in recommended_next_skills"

                # Zero duplicates across stages
                stage_skills = [
                    item["skill"]
                    for tier_list in res["roadmap_stages"].values()
                    for item in tier_list
                ]
                assert len(stage_skills) == len(set(stage_skills)), "Duplicate skills across stages"

                # Prerequisite ordering: every actionable skill must have 0 unmet prerequisites
                for item in res["recommended_next_skills"]:
                    assert item["unmet_prerequisites"] == []
                for item in res["blocked_skills"]:
                    assert len(item["unmet_prerequisites"]) > 0
            else:
                if "expected_error_code" in tc:
                    assert res.get("error_code") == tc["expected_error_code"], (
                        f"Expected {tc['expected_error_code']}, got {res.get('error_code')}"
                    )
            passed += 1
        except AssertionError as exc:
            failed += 1
            failures.append({"id": tc["id"], "scenario": tc["scenario"], "error": str(exc)})

    # 4. Specific scenario assertions
    # cr-11: unknown skills reported in uncertain_skills
    assert "Quantum Knitting" in results_by_id["cr-11"]["uncertain_skills"]
    # cr-12: ML Engineer beginner must NOT have Deep Learning or ML Deployment as immediately actionable
    rec_12 = {x["skill"] for x in results_by_id["cr-12"]["recommended_next_skills"]}
    assert "Deep Learning & NLP" not in rec_12
    assert "ML Deployment" not in rec_12
    # cr-13: incomplete profile reported in unprovided_profile_fields without inventing gaps
    assert "education" in results_by_id["cr-13"]["current_skill_assessment"]["unprovided_profile_fields"]
    # cr-14: all skills completed -> 0 missing, 0 recommended
    assert results_by_id["cr-14"]["missing_skills"] == []
    assert results_by_id["cr-14"]["recommended_next_skills"] == []
    # cr-16/17/18: disambiguation checks
    assert "JavaScript" not in results_by_id["cr-16"]["known_skills"]
    assert "SQL" not in results_by_id["cr-17"]["known_skills"]
    assert "Machine Learning" not in results_by_id["cr-18"]["known_skills"]

    # 5. Repeated inference & model reuse
    model_id_before = id(engine._model)
    _ = engine.generate_roadmap("Frontend Developer", known_skills=["HTML5"])
    assert id(engine._model) == model_id_before

    # 6. Model comparison
    model_comp = compare_minilm_vs_tfidf(engine)
    elapsed = round(time.perf_counter() - t_start, 3)

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    eval_report = {
        "total_cases": len(cases),
        "passed": passed,
        "failed": failed,
        "failures": failures,
        "dag_validation": {
            "production_graph_acyclic": True,
            "cycle_detection_verified": True,
            "invalid_reference_detection_verified": True,
        },
        "resource_verification": {
            "total_resources": len(SKILL_TAXONOMY),
            "all_https_official_domains": True,
        },
        "runtime_seconds": elapsed,
        "case_summaries": [
            {
                "id": tc["id"],
                "scenario": tc["scenario"],
                "valid": results_by_id[tc["id"]]["valid"],
                "target_role": results_by_id[tc["id"]].get("target_role"),
                "coverage_percent": results_by_id[tc["id"]].get("current_skill_assessment", {}).get("coverage_percent"),
                "actionable_count": len(results_by_id[tc["id"]].get("recommended_next_skills", [])),
                "blocked_count": len(results_by_id[tc["id"]].get("blocked_skills", [])),
            }
            for tc in cases
        ],
    }

    prereq_graph = {
        sid: meta["prerequisites"] for sid, meta in SKILL_TAXONOMY.items()
    }
    config = {
        "role_threshold": DEFAULT_ROLE_THRESHOLD,
        "ambiguity_margin": DEFAULT_AMBIGUITY_MARGIN,
        "skill_threshold": DEFAULT_SKILL_THRESHOLD,
        "model_source": "models/all-MiniLM-L6-v2",
    }

    (ARTIFACTS_DIR / "evaluation_report.json").write_text(json.dumps(eval_report, indent=2), encoding="utf-8")
    (ARTIFACTS_DIR / "model_comparison.json").write_text(json.dumps(model_comp, indent=2), encoding="utf-8")
    (ARTIFACTS_DIR / "skill_taxonomy.json").write_text(json.dumps(SKILL_TAXONOMY, indent=2), encoding="utf-8")
    (ARTIFACTS_DIR / "role_requirements.json").write_text(json.dumps(ROLE_REQUIREMENTS, indent=2), encoding="utf-8")
    (ARTIFACTS_DIR / "prerequisite_graph.json").write_text(json.dumps(prereq_graph, indent=2), encoding="utf-8")
    (ARTIFACTS_DIR / "roadmap_config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")

    return {"evaluation_report": eval_report, "model_comparison": model_comp}


if __name__ == "__main__":
    output = run_evaluation()
    print(json.dumps({
        "passed": output["evaluation_report"]["passed"],
        "failed": output["evaluation_report"]["failed"],
        "failures": output["evaluation_report"]["failures"],
        "model_comparison": output["model_comparison"],
    }, indent=2))
