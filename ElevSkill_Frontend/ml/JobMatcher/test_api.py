"""
Automated API tests for CareerPilot AI — Phase 3E-3 Job Matcher FastAPI Service.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import app, create_app


STRONG_PROFILE = {
    "education": "B.S. in Computer Science (2026)",
    "experience_level": "Fresh Graduate / Internship",
    "skills": ["JavaScript", "React", "HTML5", "CSS3", "REST API", "Git", "Vite", "Vitest"],
    "project_descriptions": [
        "Built a responsive student course planner with React, JavaScript, and CSS3 used by 400+ students.",
        "Integrated REST APIs and wrote unit tests with Vitest and Git pull requests.",
    ],
}

FRONTEND_JOB = {
    "title": "Junior Frontend Developer",
    "description": (
        "Requirements:\n"
        "- Solid foundation in JavaScript, React, HTML5, and CSS3.\n"
        "- Experience integrating REST APIs and using Git.\n"
        "Preferred:\n"
        "- Docker and Vitest testing."
    ),
}

UNRELATED_JOB = {
    "title": "Head Pastry Chef",
    "description": (
        "Requirements:\n"
        "- 5 years commercial bakery experience, sourdough fermentation, croissant lamination, "
        "and commercial kitchen inventory management."
    ),
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint_ok(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert data["offline_available"] is True
    assert data["model_name"] == "all-MiniLM-L6-v2"


def test_strong_job_match(client: TestClient):
    resp = client.post("/match", json={"profile": STRONG_PROFILE, "job": FRONTEND_JOB})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["overall_match_score"] >= 75
    assert "React" in data["matched_skills"]
    assert data["model_used"] == "all-MiniLM-L6-v2"
    assert len(data["relevant_profile_evidence"]) > 0


def test_partial_job_match(client: TestClient):
    partial_profile = {
        "skills": ["JavaScript", "React", "Git"],
        "project_descriptions": ["Built a React UI with JavaScript and Git."],
    }
    resp = client.post("/match", json={"profile": partial_profile, "job": FRONTEND_JOB})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert 20 <= data["overall_match_score"] < 85
    assert len(data["missing_required_skills"]) > 0


def test_unrelated_job_match(client: TestClient):
    resp = client.post("/match", json={"profile": STRONG_PROFILE, "job": UNRELATED_JOB})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["overall_match_score"] < 20
    assert data["matched_skills"] == []


def test_required_vs_preferred_skill_distinction(client: TestClient):
    resp = client.post("/match", json={"profile": STRONG_PROFILE, "job": FRONTEND_JOB})
    assert resp.status_code == 200
    data = resp.json()
    assert data["required_skill_coverage"] == 100.0
    assert "Docker" in data["missing_preferred_skills"]
    assert data["missing_required_skills"] == []


def test_missing_profile_information_excluded_honestly(client: TestClient):
    projects_only = {
        "skills": ["JavaScript", "React", "HTML5", "CSS3"],
        "project_descriptions": ["Built responsive web apps with React and CSS3."],
    }
    no_pref_job = {
        "title": "Frontend Developer",
        "description": "Requirements:\n- Experience with JavaScript, React, HTML5, and CSS3.",
    }
    resp = client.post("/match", json={"profile": projects_only, "job": no_pref_job})
    assert resp.status_code == 200
    data = resp.json()
    excluded = data["diagnostics"]["excluded_dimensions"]
    assert "education_qualification_alignment" in excluded
    assert "preferred_skill_coverage" in excluded
    assert data["dimension_scores"]["education_qualification_alignment"]["score_percent"] is None


def test_empty_and_whitespace_inputs_return_422(client: TestClient):
    assert (
        client.post(
            "/match",
            json={"profile": STRONG_PROFILE, "job": {"description": "   \n  "}},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/match",
            json={"profile": {"resume_text": "   "}, "job": FRONTEND_JOB},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/match",
            json={"profile": STRONG_PROFILE, "job": {"description": "Need React dev."}},
        ).status_code
        == 422
    )


def test_missing_fields_and_invalid_types_return_422(client: TestClient):
    assert client.post("/match", json={"profile": STRONG_PROFILE}).status_code == 422
    assert client.post("/match", json={"job": FRONTEND_JOB}).status_code == 422
    assert (
        client.post(
            "/match",
            json={"profile": {"skills": "not-a-list"}, "job": FRONTEND_JOB},
        ).status_code
        == 422
    )


def test_overlong_input_returns_422(client: TestClient):
    too_long_jd = "React JavaScript HTML5 CSS3 " * 1500  # > 25,000 chars
    resp = client.post(
        "/match",
        json={"profile": STRONG_PROFILE, "job": {"description": too_long_jd}},
    )
    assert resp.status_code == 422


def test_repeated_requests_reuse_engine_and_model(client: TestClient):
    engine_before = app.state.engine
    model_id_before = id(engine_before._model)
    r1 = client.post("/match", json={"profile": STRONG_PROFILE, "job": FRONTEND_JOB})
    r2 = client.post("/match", json={"profile": STRONG_PROFILE, "job": UNRELATED_JOB})
    assert r1.status_code == 200 and r2.status_code == 200
    assert app.state.engine is engine_before
    assert id(app.state.engine._model) == model_id_before


def test_model_loading_failure_returns_degraded_and_503():
    broken_app = create_app(model_name_or_path="D:/nonexistent/path/missing-job-model")
    with TestClient(broken_app) as broken_client:
        h = broken_client.get("/health")
        assert h.status_code == 200
        assert h.json()["status"] == "degraded"
        assert h.json()["model_loaded"] is False
        assert h.json()["offline_available"] is False

        resp = broken_client.post(
            "/match", json={"profile": STRONG_PROFILE, "job": FRONTEND_JOB}
        )
        assert resp.status_code == 503
        assert resp.json()["error_code"] == "MODEL_UNAVAILABLE"
        assert "Traceback" not in resp.text
        assert "D:/nonexistent" not in resp.text


def test_runtime_inference_failure_returns_503_without_stacktrace(client: TestClient, monkeypatch):
    def boom(*_args, **_kwargs):
        raise RuntimeError("Simulated inference crash at D:/secret/internal/path")

    monkeypatch.setattr(app.state.engine, "match", boom)
    resp = client.post("/match", json={"profile": STRONG_PROFILE, "job": FRONTEND_JOB})
    assert resp.status_code == 503
    body = resp.json()
    assert body["error_code"] == "INFERENCE_UNAVAILABLE"
    assert "Traceback" not in resp.text
    assert "D:/secret/internal/path" not in resp.text


def test_regression_frontend_data_scientist_and_aiml_matching(client: TestClient):
    # Test 1: Frontend Developer
    r1 = client.post(
        "/match",
        json={
            "profile": {
                "resume_text": "Skills: JavaScript, React, HTML5, CSS3, Git, REST APIs, Node.js, SQL.",
                "experience_level": "Fresher",
            },
            "job": {
                "title": "Frontend Developer",
                "description": (
                    "Required: JavaScript, HTML5, CSS3, React, REST API integration, Git, collaborative code reviews.\n"
                    "Preferred: TypeScript, Vitest, Jest, WCAG accessibility."
                ),
            },
        },
    )
    assert r1.status_code == 200
    d1 = r1.json()
    for skill in ["JavaScript", "HTML5", "CSS3", "React", "REST API", "Git"]:
        assert skill in d1["matched_required_skills"]
    assert "WCAG Accessibility" in d1["missing_preferred_skills"]

    # Test 2: Data Scientist
    r2 = client.post(
        "/match",
        json={
            "profile": {
                "resume_text": "Skills: Python, SQL, Pandas, NumPy, Scikit-learn, statistics, machine learning, preprocessing, EDA, visualization.",
            },
            "job": {
                "title": "Data Scientist",
                "description": (
                    "Required: Python, SQL, Machine Learning, Pandas, NumPy, Scikit-learn, Statistics, Data Preprocessing, EDA, Data Visualization.\n"
                    "Preferred: TensorFlow, PyTorch, Power BI/Tableau, AWS, Deep Learning."
                ),
            },
        },
    )
    assert r2.status_code == 200
    d2 = r2.json()
    for skill in ["Python", "SQL", "Machine Learning", "Pandas", "NumPy", "scikit-learn", "Statistics", "Data Preprocessing", "Exploratory Data Analysis", "Data Visualization"]:
        assert skill in d2["matched_required_skills"]
    for pref in ["TensorFlow", "PyTorch", "Power BI", "Tableau", "AWS", "Deep Learning"]:
        assert pref in d2["missing_preferred_skills"]

    # Test 3: AI/ML Engineer (backend API integration must NOT imply REST API)
    r3 = client.post(
        "/match",
        json={
            "profile": {
                "resume_text": "Skills: Python, Machine Learning, Scikit-learn, Pandas, NumPy, SQL, TensorFlow, Git, NLP techniques, backend API integration.",
            },
            "job": {
                "title": "AI/ML Engineer",
                "description": (
                    "Required: Python, Machine Learning, Scikit-learn, Pandas, NumPy, SQL, Git, REST API.\n"
                    "Preferred: TensorFlow/PyTorch, Deep Learning, NLP, Docker, LLMs."
                ),
            },
        },
    )
    assert r3.status_code == 200
    d3 = r3.json()
    assert "REST API" in d3["missing_required_skills"]
    assert "TensorFlow" in d3["matched_preferred_skills"]
    assert "NLP" in d3["matched_preferred_skills"]
    for pref_miss in ["PyTorch", "Deep Learning", "Docker", "LLMs"]:
        assert pref_miss in d3["missing_preferred_skills"]
