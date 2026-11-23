"""
CareerPilot AI — Phase 3D-2: Interview Coach Evaluation & 3-Way Model Benchmark
===============================================================================
Curated PII-free development/evaluation benchmark (20 test cases across 4 categories)
+ 3-way model comparison: BAAI/bge-small-en-v1.5 vs all-MiniLM-L6-v2 vs TF-IDF.

Note: These are curated development/evaluation examples, NOT human-graded interview data.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from interview_coach import (
    InterviewCoachEngine,
    QUESTION_BANK,
    RESUME_ANALYZER_MINILM_DIR,
)

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
MODELS_DIR = Path(__file__).resolve().parent / "models"

BENCHMARK_CASES: List[Dict[str, Any]] = [
    # --- BEHAVIORAL ---
    {
        "id": "tc-01",
        "category": "behavioral",
        "question_id": "beh-1",
        "tier": "strong",
        "answer": (
            "During my capstone project last semester, our course planner stopped syncing saved schedules "
            "right before our demo. My task was to find the root cause and fix it within one day. "
            "I reproduced the bug locally, inspected browser storage writes, and wrote unit tests that "
            "revealed a stale state overwrite. I refactored the state updater and verified every edge case. "
            "As a result, the sync bug was completely resolved and our team delivered the demo on time."
        ),
    },
    {
        "id": "tc-02",
        "category": "behavioral",
        "question_id": "beh-1",
        "tier": "missing_result",
        "answer": (
            "In my software engineering class project, the login form kept resetting whenever users "
            "clicked submit. My responsibility was to investigate why the form state was lost. "
            "I checked the event handler, noticed we missed preventDefault, and updated the component."
        ),
    },
    {
        "id": "tc-03",
        "category": "behavioral",
        "question_id": "beh-2",
        "tier": "strong",
        "answer": (
            "In a four-person web app project, two teammates disagreed on whether to use plain CSS or a "
            "UI library. My goal was to help the team reach a practical decision without delaying our sprint. "
            "I listened to both sides, listed the learning curve and bundle size tradeoffs, and proposed a "
            "shared CSS token file. Everyone agreed, and we shipped our responsive layout two days early."
        ),
    },
    {
        "id": "tc-04",
        "category": "behavioral",
        "question_id": "beh-1",
        "tier": "vague",
        "answer": (
            "Basically there was kind of a bug in my project and stuff was not working properly. "
            "I guess I looked at it maybe a few times and tried things until it worked."
        ),
    },
    {
        "id": "tc-05",
        "category": "behavioral",
        "question_id": "beh-2",
        "tier": "off_topic",
        "answer": (
            "My favorite programming language is Python because the syntax is clean and I enjoy "
            "baking sourdough bread on weekends."
        ),
    },
    # --- FRONTEND ---
    {
        "id": "tc-06",
        "category": "frontend",
        "question_id": "fe-1",
        "tier": "strong",
        "answer": (
            "In React, props are read-only inputs passed from a parent component to a child, whereas "
            "state is managed internally inside a component and updated using a setter like useState, "
            "which triggers a re-render. For example, when two sibling filter components need to share "
            "the same search query, we lift that state up to their common parent component and pass the "
            "value and change handler down as props."
        ),
    },
    {
        "id": "tc-07",
        "category": "frontend",
        "question_id": "fe-1",
        "tier": "paraphrased",
        "answer": (
            "External configuration values handed down by an enclosing UI element cannot be modified by "
            "the receiving widget, while local memory owned by that widget changes over time and refreshes "
            "the view. If multiple child widgets must stay synchronized on one shared value, you move "
            "that shared memory upward into their nearest shared container and pass callbacks downward."
        ),
    },
    {
        "id": "tc-08",
        "category": "frontend",
        "question_id": "fe-1",
        "tier": "partial",
        "answer": (
            "Props are passed into components and state is data inside a component. Both are used in React."
        ),
    },
    {
        "id": "tc-09",
        "category": "frontend",
        "question_id": "fe-2",
        "tier": "strong",
        "answer": (
            "To make a dashboard responsive and accessible, I use CSS Grid and Flexbox with media query "
            "breakpoints so multi-column cards stack cleanly on mobile. For accessibility, I use semantic "
            "HTML landmarks, proper form labels, clear focus indicators for keyboard navigation, high "
            "text contrast, and ARIA attributes on custom controls like toggle switches."
        ),
    },
    {
        "id": "tc-10",
        "category": "frontend",
        "question_id": "fe-2",
        "tier": "off_topic",
        "answer": (
            "I usually normalize SQL tables to third normal form and configure database indexes for joins."
        ),
    },
    # --- DSA ---
    {
        "id": "tc-11",
        "category": "dsa",
        "question_id": "dsa-1",
        "tier": "strong",
        "answer": (
            "Big O describes how time and memory space grow as the input size n increases. For example, "
            "looking up a user by ID in a hash map takes O(1) constant time, whereas scanning an unsorted "
            "array takes O(n) linear time. In real apps, choosing an O(1) lookup over an O(n^2) nested "
            "loop keeps pages fast as datasets scale, trading a bit of extra memory for speed."
        ),
    },
    {
        "id": "tc-12",
        "category": "dsa",
        "question_id": "dsa-1",
        "tier": "paraphrased",
        "answer": (
            "Asymptotic notation tells us how execution steps and RAM consumption scale when data grows "
            "large. Checking a dictionary key stays constant regardless of size, while searching item by "
            "item grows proportionally with the list length. That tradeoff matters when user tables expand."
        ),
    },
    {
        "id": "tc-13",
        "category": "dsa",
        "question_id": "dsa-2",
        "tier": "strong",
        "answer": (
            "First, I would debounce the search input by 200ms so filtering does not run on every keystroke. "
            "Second, I would memoize filtered results and pre-index searchable text. Finally, for rendering "
            "5,000 DOM nodes, I would add list virtualization or pagination and measure render timing."
        ),
    },
    {
        "id": "tc-14",
        "category": "dsa",
        "question_id": "dsa-2",
        "tier": "partial",
        "answer": (
            "I would probably add a debounce timer so the search waits before running."
        ),
    },
    {
        "id": "tc-15",
        "category": "dsa",
        "question_id": "dsa-1",
        "tier": "one_word",
        "answer": "Fast.",
    },
    # --- GENERAL ---
    {
        "id": "tc-16",
        "category": "general",
        "question_id": "gen-1",
        "tier": "strong",
        "answer": (
            "I am excited about this entry-level role because my coursework and React projects align "
            "directly with building user-facing web tools. In my campus lab internship, I learned fastest "
            "in a collaborative team that gave constructive code review feedback. My goal is to take "
            "ownership of small features early and grow into a reliable contributor."
        ),
    },
    {
        "id": "tc-17",
        "category": "general",
        "question_id": "gen-2",
        "tier": "strong",
        "answer": (
            "Outside of class, I taught myself FastAPI by reading the official documentation and building "
            "a local NLP service for my portfolio project. When I hit CORS and validation bugs, I wrote "
            "automated pytest tests to verify every endpoint. As a result, I gained confidence connecting "
            "Python backends to React frontends."
        ),
    },
    {
        "id": "tc-18",
        "category": "general",
        "question_id": "gen-2",
        "tier": "partial",
        "answer": (
            "I learned some React from YouTube tutorials and made a small page."
        ),
    },
    {
        "id": "tc-19",
        "category": "general",
        "question_id": "gen-1",
        "tier": "long_repetitive",
        "answer": (
            "I want to learn and grow and learn in a good team environment where I can learn new things. "
            * 14
        ).strip(),
    },
    {
        "id": "tc-20",
        "category": "general",
        "question_id": "gen-1",
        "tier": "off_topic",
        "answer": (
            "Kubernetes pods are scheduled onto worker nodes using resource requests and taints."
        ),
    },
]


def benchmark_models() -> Dict[str, Any]:
    """Benchmarks BAAI/bge-small-en-v1.5, all-MiniLM-L6-v2, and TF-IDF on BENCHMARK_CASES."""
    minilm_src = str(RESUME_ANALYZER_MINILM_DIR) if RESUME_ANALYZER_MINILM_DIR.exists() else "sentence-transformers/all-MiniLM-L6-v2"
    model_specs = [
        ("BAAI/bge-small-en-v1.5", "BAAI/bge-small-en-v1.5"),
        ("all-MiniLM-L6-v2", minilm_src),
    ]

    summary: Dict[str, Any] = {}

    for label, src in model_specs:
        engine = InterviewCoachEngine(model_name_or_path=src)
        t_load0 = time.perf_counter()
        engine._get_model()
        load_sec = round(time.perf_counter() - t_load0, 3)

        tier_sims: Dict[str, List[float]] = {"strong": [], "paraphrased": [], "partial": [], "off_topic": []}
        t_inf0 = time.perf_counter()
        for tc in BENCHMARK_CASES:
            q = QUESTION_BANK[tc["question_id"]]["question"]
            vecs = engine._encode([q, tc["answer"]])
            sim = float(np.clip(np.dot(vecs[0], vecs[1]), 0.0, 1.0))
            if tc["tier"] in tier_sims:
                tier_sims[tc["tier"]].append(sim)
        inf_ms = round(((time.perf_counter() - t_inf0) / len(BENCHMARK_CASES)) * 1000, 2)

        mean_by_tier = {k: round(float(np.mean(v)), 4) for k, v in tier_sims.items() if v}
        separation = round(mean_by_tier["strong"] - mean_by_tier["off_topic"], 4)
        para_sep = round(mean_by_tier["paraphrased"] - mean_by_tier["off_topic"], 4)

        summary[label] = {
            "load_seconds": load_sec,
            "avg_inference_ms_per_pair": inf_ms,
            "mean_similarity_by_tier": mean_by_tier,
            "strong_minus_offtopic": separation,
            "paraphrased_minus_offtopic": para_sep,
        }

    # TF-IDF lexical baseline
    tier_sims_lex: Dict[str, List[float]] = {"strong": [], "paraphrased": [], "partial": [], "off_topic": []}
    t_lex0 = time.perf_counter()
    for tc in BENCHMARK_CASES:
        q = QUESTION_BANK[tc["question_id"]]["question"]
        try:
            vec = TfidfVectorizer(stop_words="english")
            mat = vec.fit_transform([q, tc["answer"]])
            sim = float(cosine_similarity(mat[0:1], mat[1:2])[0][0])
        except ValueError:
            sim = 0.0
        if tc["tier"] in tier_sims_lex:
            tier_sims_lex[tc["tier"]].append(sim)
    lex_ms = round(((time.perf_counter() - t_lex0) / len(BENCHMARK_CASES)) * 1000, 2)
    mean_lex = {k: round(float(np.mean(v)), 4) for k, v in tier_sims_lex.items() if v}
    summary["TF-IDF Baseline"] = {
        "load_seconds": 0.0,
        "avg_inference_ms_per_pair": lex_ms,
        "mean_similarity_by_tier": mean_lex,
        "strong_minus_offtopic": round(mean_lex["strong"] - mean_lex["off_topic"], 4),
        "paraphrased_minus_offtopic": round(mean_lex["paraphrased"] - mean_lex["off_topic"], 4),
    }
    return summary


def run_functional_tests(engine: InterviewCoachEngine) -> Dict[str, Any]:
    # 1. Invalid inputs
    assert engine.evaluate("", "behavioral")["valid"] is False
    assert engine.evaluate("   \n\t ", "frontend")["valid"] is False
    assert engine.evaluate("Valid answer", "nonexistent")["valid"] is False

    # 2. Evaluate all 20 benchmark cases
    results_by_id: Dict[str, Dict[str, Any]] = {}
    for tc in BENCHMARK_CASES:
        res = engine.evaluate(
            answer_text=tc["answer"],
            category=tc["category"],
            question_id=tc["question_id"],
        )
        assert res["valid"] is True
        results_by_id[tc["id"]] = res

    # 3. Verify behavioral STAR & scoring consistency
    assert results_by_id["tc-01"]["overall_score"] > results_by_id["tc-04"]["overall_score"]
    assert results_by_id["tc-01"]["overall_score"] > results_by_id["tc-05"]["overall_score"]
    assert results_by_id["tc-01"]["star_assessment"]["result"]["present"] is True
    assert results_by_id["tc-02"]["star_assessment"]["result"]["present"] is False

    # 4. Verify technical scoring & concept sensitivity
    assert results_by_id["tc-06"]["overall_score"] > results_by_id["tc-08"]["overall_score"]
    assert results_by_id["tc-07"]["overall_score"] > results_by_id["tc-10"]["overall_score"]
    assert results_by_id["tc-11"]["overall_score"] > results_by_id["tc-15"]["overall_score"]
    assert len(results_by_id["tc-08"]["missing_concepts"]) > len(results_by_id["tc-06"]["missing_concepts"])

    # 5. Verify long/repetitive penalty vs strong general answer
    assert results_by_id["tc-16"]["overall_score"] > results_by_id["tc-19"]["overall_score"]

    # 6. Verify repeated inference reuses the same loaded model instance
    model_id_before = id(engine._model)
    _ = engine.evaluate("React props are read-only and state is internal.", "frontend", question_id="fe-1")
    assert id(engine._model) == model_id_before

    return {
        "total_cases": len(BENCHMARK_CASES),
        "all_assertions_passed": True,
        "case_scores": {
            tc["id"]: {
                "category": tc["category"],
                "tier": tc["tier"],
                "score": results_by_id[tc["id"]]["overall_score"],
                "relevance": results_by_id[tc["id"]]["question_relevance_similarity"],
                "covered_count": len(results_by_id[tc["id"]]["covered_concepts"]),
                "missing_count": len(results_by_id[tc["id"]]["missing_concepts"]),
                "star_present": (
                    sum(1 for v in results_by_id[tc["id"]]["star_assessment"].values() if v["present"])
                    if results_by_id[tc["id"]]["star_assessment"]
                    else None
                ),
            }
            for tc in BENCHMARK_CASES
        },
    }


if __name__ == "__main__":
    model_bench = benchmark_models()
    # Select model with highest (strong - off_topic + paraphrased - off_topic) separation
    bge_gain = model_bench["BAAI/bge-small-en-v1.5"]["strong_minus_offtopic"] + model_bench["BAAI/bge-small-en-v1.5"]["paraphrased_minus_offtopic"]
    mini_gain = model_bench["all-MiniLM-L6-v2"]["strong_minus_offtopic"] + model_bench["all-MiniLM-L6-v2"]["paraphrased_minus_offtopic"]
    selected_name = "BAAI/bge-small-en-v1.5" if bge_gain >= mini_gain else "all-MiniLM-L6-v2"

    chosen_src = (
        "BAAI/bge-small-en-v1.5"
        if selected_name == "BAAI/bge-small-en-v1.5"
        else (str(RESUME_ANALYZER_MINILM_DIR) if RESUME_ANALYZER_MINILM_DIR.exists() else "sentence-transformers/all-MiniLM-L6-v2")
    )
    engine = InterviewCoachEngine(model_name_or_path=chosen_src)
    func_report = run_functional_tests(engine)

    # Save selected model locally for offline inference
    save_dir = MODELS_DIR / ("bge-small-en-v1.5" if selected_name == "BAAI/bge-small-en-v1.5" else "all-MiniLM-L6-v2")
    save_dir.mkdir(parents=True, exist_ok=True)
    engine._get_model().save(str(save_dir))

    # Verify offline reload from saved local dir
    offline_engine = InterviewCoachEngine(model_name_or_path=str(save_dir))
    offline_check = offline_engine.evaluate(BENCHMARK_CASES[0]["answer"], "behavioral", question_id="beh-1")
    assert offline_check["valid"] is True

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    full_report = {
        "model_benchmark": model_bench,
        "selected_model": selected_name,
        "saved_model_path": str(save_dir),
        "functional_evaluation": func_report,
    }
    (ARTIFACTS_DIR / "evaluation_report.json").write_text(json.dumps(full_report, indent=2), encoding="utf-8")
    (ARTIFACTS_DIR / "question_bank.json").write_text(json.dumps(QUESTION_BANK, indent=2), encoding="utf-8")
    print(json.dumps({"selected_model": selected_name, "model_benchmark": model_bench, "total_cases": func_report["total_cases"]}, indent=2))
