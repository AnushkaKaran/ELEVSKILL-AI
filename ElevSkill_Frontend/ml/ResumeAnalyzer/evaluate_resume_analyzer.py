"""
CareerPilot AI — Phase 3A Evaluation & Functional Test Suite
============================================================
Separates:
  1. Functional & Edge-Case Validation (8 required test cases)
  2. Semantic vs. Lexical Model-Quality Comparison on controlled pairs
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Dict, List

from resume_analyzer import ResumeAnalyzerEngine

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"

TEST_CASES: List[Dict[str, str]] = [
    {
        "name": "1_empty_resume",
        "resume": "   \n  ",
        "jd": "Junior Frontend Developer requiring React and JavaScript.",
    },
    {
        "name": "2_very_short_resume",
        "resume": "John Doe. CS student. Knows Python.",
        "jd": "",
    },
    {
        "name": "3_missing_sections_resume",
        "resume": (
            "Software developer with 1 year of coding practice. Built web pages with HTML5, "
            "CSS3, and JavaScript. Used Git for version control and deployed static sites."
        ),
        "jd": "",
    },
    {
        "name": "4_multi_skill_resume",
        "resume": (
            "contact@example.edu | github.com/dev-student\n\n"
            "Skills\n"
            "Python, JavaScript, TypeScript, React, Node.js, FastAPI, PostgreSQL, MongoDB, Docker, Git, AWS\n\n"
            "Experience\n"
            "- Built REST APIs with FastAPI and PostgreSQL serving 1,200+ daily requests.\n"
            "- Implemented React and TypeScript dashboard components, reducing render time by 25%.\n"
        ),
        "jd": "",
    },
    {
        "name": "5_projects_and_education_resume",
        "resume": (
            "student@university.edu | linkedin.com/in/cs-grad\n\n"
            "Education\n"
            "B.S. in Computer Science, State University (2026) — Coursework: Data Structures, Databases, OS\n\n"
            "Projects\n"
            "- Campus Course Planner: Built a responsive React and CSS3 web app used by 400+ students.\n"
            "- StudyTrack API: Engineered a Python Flask and SQLite backend with 95% pytest coverage.\n\n"
            "Skills\n"
            "Python, JavaScript, React, Flask, SQLite, Git\n"
        ),
        "jd": "",
    },
    {
        "name": "6_matched_job_description",
        "resume": (
            "grad@university.edu | github.com/frontend-grad\n\n"
            "Education\n"
            "B.S. Computer Science, Graduating 2026\n\n"
            "Experience\n"
            "Frontend Intern — Campus Lab\n"
            "- Built reusable React UI components with JavaScript ES6+ and CSS3 for 400+ students.\n"
            "- Integrated REST APIs and collaborated via Git pull requests.\n\n"
            "Projects\n"
            "- Task Tracker: Implemented responsive dashboard with Vite and Vitest unit tests.\n\n"
            "Skills\n"
            "JavaScript, React, HTML5, CSS3, REST API, Git, Vite, Vitest\n"
        ),
        "jd": (
            "Junior Frontend Developer\n"
            "We are hiring a Computer Science graduate to build responsive user interfaces using "
            "React, JavaScript, HTML5, and CSS3. Must integrate REST APIs, write unit tests with Vitest, "
            "and collaborate using Git."
        ),
    },
    {
        "name": "7_unrelated_job_description",
        "resume": (
            "grad@university.edu | github.com/frontend-grad\n\n"
            "Education\n"
            "B.S. Computer Science, Graduating 2026\n\n"
            "Projects\n"
            "- Built responsive React and CSS3 web applications with Vite and JavaScript.\n\n"
            "Skills\n"
            "JavaScript, React, HTML5, CSS3, Git, Figma\n"
        ),
        "jd": (
            "Embedded Firmware & Kernel Engineer\n"
            "Seeking an engineer experienced in C, C++, RTOS, Linux kernel device drivers, "
            "SPI/I2C hardware protocols, and oscilloscope debugging for medical IoT devices."
        ),
    },
    {
        "name": "8_unusual_formatting_and_repetition",
        "resume": (
            "EMAIL:   test@uni.edu\n\n\n\n"
            "EXPERIENCE:\n"
            "* Worked on building backend scripts.\n"
            "* Worked on fixing database queries.\n"
            "* Worked on writing documentation.\n"
            "* Worked on testing endpoints.\n"
            "SKILLS:\n"
            "Python, SQL, Git\n"
        ),
        "jd": "Backend Intern needing Python, PostgreSQL, and Docker.",
    },
]


def run_evaluation() -> Dict:
    engine = ResumeAnalyzerEngine()
    results = []

    t0 = time.perf_counter()
    for tc in TEST_CASES:
        res = engine.analyze(tc["resume"], tc["jd"] or None)
        entry = {
            "case": tc["name"],
            "valid": res.get("valid", False),
            "overall_score": res.get("overall_score", 0),
            "detected_skills_count": len(res.get("skills_analysis", {}).get("detected_skills", []))
            if res.get("valid")
            else 0,
            "missing_sections": res.get("missing_sections", []) if res.get("valid") else [],
            "semantic_similarity": (
                res["semantic_relevance"]["overall_similarity"]
                if res.get("valid") and res.get("semantic_relevance")
                else None
            ),
            "lexical_tfidf_similarity": (
                res["semantic_relevance"]["lexical_tfidf_similarity"]
                if res.get("valid") and res.get("semantic_relevance")
                else None
            ),
            "weak_bullets_count": (
                len(res.get("quality_analysis", {}).get("weak_bullets", []))
                if res.get("valid")
                else 0
            ),
            "repeated_openers": (
                res.get("quality_analysis", {}).get("repeated_opening_verbs", [])
                if res.get("valid")
                else []
            ),
        }
        results.append(entry)

    elapsed = round(time.perf_counter() - t0, 3)

    # Functional Assertions
    by_name = {r["case"]: r for r in results}
    assert by_name["1_empty_resume"]["valid"] is False, "Empty resume should be marked invalid"
    assert by_name["2_very_short_resume"]["overall_score"] < 40, "Very short resume should score low"
    assert "education" in by_name["3_missing_sections_resume"]["missing_sections"]
    assert by_name["4_multi_skill_resume"]["detected_skills_count"] >= 8
    assert by_name["5_projects_and_education_resume"]["overall_score"] > by_name["2_very_short_resume"]["overall_score"]
    assert (
        by_name["6_matched_job_description"]["semantic_similarity"]
        > by_name["7_unrelated_job_description"]["semantic_similarity"]
    ), "Matched JD must have higher semantic similarity than unrelated JD"
    assert by_name["8_unusual_formatting_and_repetition"]["weak_bullets_count"] >= 3
    assert len(by_name["8_unusual_formatting_and_repetition"]["repeated_openers"]) >= 1

    # Paraphrase test: semantic embedding vs TF-IDF when exact words differ
    paraphrase_resume = (
        "Built client-side single page web applications, styled mobile-friendly layouts, "
        "and fetched JSON data from backend web services."
    )
    paraphrase_jd = (
        "Looking for a frontend developer to create responsive browser interfaces and "
        "integrate HTTP API endpoints."
    )
    para_res = engine.analyze(paraphrase_resume, paraphrase_jd)
    para_sem = para_res["semantic_relevance"]["overall_similarity"]
    para_lex = para_res["semantic_relevance"]["lexical_tfidf_similarity"]

    report = {
        "total_runtime_seconds": elapsed,
        "functional_cases_passed": len(results),
        "test_results": results,
        "paraphrase_comparison": {
            "semantic_minilm_similarity": para_sem,
            "lexical_tfidf_similarity": para_lex,
            "semantic_advantage": round(para_sem - para_lex, 4),
        },
    }

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = ARTIFACTS_DIR / "evaluation_report.json"
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    summary = run_evaluation()
    print(json.dumps(summary, indent=2))
