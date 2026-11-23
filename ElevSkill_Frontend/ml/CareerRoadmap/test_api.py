"""
Automated API tests for CareerPilot AI — Phase 3F-3 Career Roadmap FastAPI Service.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import app, create_app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_when_model_loaded(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert data["offline_mode"] is True
    assert data["engine_ready"] is True
    assert data["model_name"] == "all-MiniLM-L6-v2"


def test_health_and_generate_when_model_unavailable():
    broken_app = create_app(model_path="D:/nonexistent/path/missing-roadmap-model")
    with TestClient(broken_app) as broken_client:
        h = broken_client.get("/health")
        assert h.status_code == 200
        h_data = h.json()
        assert h_data["status"] == "degraded"
        assert h_data["model_loaded"] is False
        assert h_data["offline_mode"] is False
        assert h_data["engine_ready"] is False

        r = broken_client.post("/generate", json={"target_role": "Data Scientist"})
        assert r.status_code == 503
        assert r.json()["error_code"] == "MODEL_UNAVAILABLE"
        assert "Traceback" not in r.text
        assert "D:/nonexistent" not in r.text


def test_valid_data_scientist_roadmap(client: TestClient):
    resp = client.post(
        "/generate",
        json={
            "target_role": "Junior Data Science Grad",
            "known_skills": ["Python", "SQL"],
            "education": "B.S. Computer Science",
            "experience_level": "Fresh Graduate",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["target_role"] == "Data Scientist"
    assert "Python" in data["known_skills"]
    assert "SQL" in data["known_skills"]
    assert "Python" not in data["missing_skills"]
    assert data["model_used"] == "all-MiniLM-L6-v2"


def test_valid_frontend_and_backend_roadmaps(client: TestClient):
    fe = client.post(
        "/generate",
        json={"target_role": "Frontend Developer", "known_skills": ["HTML5", "CSS3", "JavaScript", "Git"]},
    )
    assert fe.status_code == 200
    fe_data = fe.json()
    assert fe_data["valid"] is True
    assert fe_data["target_role"] == "Frontend Developer"
    next_fe = {x["skill"] for x in fe_data["recommended_next_skills"]}
    assert "React" in next_fe
    assert "TypeScript" in next_fe

    be = client.post(
        "/generate",
        json={"target_role": "Backend Developer", "known_skills": ["Python", "SQL", "Git"]},
    )
    assert be.status_code == 200
    be_data = be.json()
    assert be_data["valid"] is True
    assert be_data["target_role"] == "Backend Developer"


def test_full_stack_developer_variants_and_coverage(client: TestClient):
    expected_full_stack_skills = {
        "HTML5",
        "CSS3",
        "JavaScript",
        "TypeScript",
        "React",
        "Node.js",
        "REST API",
        "SQL",
        "Git",
        "Automated Testing",
        "Docker",
    }

    for variant in ("Full Stack Developer", "Full-Stack Developer", "Fullstack Developer"):
        resp = client.post("/generate", json={"target_role": variant})
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is True
        assert data["target_role"] == "Full Stack Developer"
        assert data["role_resolution"]["canonical_role"] == "Full Stack Developer"
        assert data["role_resolution"]["matched_by"] == "exact"
        assert data["role_resolution"]["confidence"] == 1.0
        assert set(data["missing_skills"]) == expected_full_stack_skills

    # Completing all 8 Frontend Developer skills must NOT yield 100% Full Stack coverage
    frontend_only = ["HTML5", "CSS3", "JavaScript", "Git", "REST API", "TypeScript", "React", "Automated Testing"]
    fe_only_resp = client.post(
        "/generate",
        json={"target_role": "Full Stack Developer", "completed_skills": frontend_only},
    )
    assert fe_only_resp.status_code == 200
    fe_only_data = fe_only_resp.json()
    assert fe_only_data["target_role"] == "Full Stack Developer"
    assert fe_only_data["current_skill_assessment"]["coverage_percent"] < 100.0
    assert set(fe_only_data["missing_skills"]) == {"SQL", "Node.js", "Docker"}

    # Completing all 11 required Full Stack skills yields 100% coverage
    full_resp = client.post(
        "/generate",
        json={"target_role": "Full Stack Developer", "completed_skills": sorted(expected_full_stack_skills)},
    )
    assert full_resp.status_code == 200
    full_data = full_resp.json()
    assert full_data["target_role"] == "Full Stack Developer"
    assert full_data["current_skill_assessment"]["coverage_percent"] == 100.0
    assert full_data["missing_skills"] == []


def test_optional_fields_omitted(client: TestClient):
    resp = client.post("/generate", json={"target_role": "Python Developer"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["target_role"] == "Python Developer"
    assert "education" in data["current_skill_assessment"]["unprovided_profile_fields"]


def test_completed_and_known_skills_excluded_and_no_duplicates(client: TestClient):
    resp = client.post(
        "/generate",
        json={
            "target_role": "Frontend Developer",
            "known_skills": ["HTML5", "Git"],
            "completed_skills": ["CSS3", "JavaScript"],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "HTML5" in data["known_skills"]
    assert "CSS3" in data["completed_skills"]
    assert "JavaScript" in data["completed_skills"]

    satisfied = set(data["known_skills"]) | set(data["completed_skills"])
    rec_names = [x["skill"] for x in data["recommended_next_skills"]]
    assert not (satisfied & set(rec_names))
    assert not (satisfied & set(data["missing_skills"]))

    stage_skills = [x["skill"] for lst in data["roadmap_stages"].values() for x in lst]
    assert len(stage_skills) == len(set(stage_skills))
    for item in data["recommended_next_skills"]:
        assert item["unmet_prerequisites"] == []


def test_validation_errors_return_422(client: TestClient):
    # Empty & whitespace target_role
    assert client.post("/generate", json={"target_role": ""}).status_code == 422
    assert client.post("/generate", json={"target_role": "   \n\t  "}).status_code == 422
    # Missing target_role
    assert client.post("/generate", json={"known_skills": ["Python"]}).status_code == 422
    # Invalid input types
    assert client.post("/generate", json={"target_role": 12345}).status_code == 422
    assert client.post("/generate", json={"target_role": "Frontend Developer", "known_skills": "React"}).status_code == 422
    # Excessively long resume_text (> 25,000 chars)
    assert (
        client.post(
            "/generate",
            json={"target_role": "Python Developer", "resume_text": "Python " * 5000},
        ).status_code
        == 422
    )
    # Excessively long project_descriptions item (> 2,000 chars)
    assert (
        client.post(
            "/generate",
            json={"target_role": "Python Developer", "project_descriptions": ["Built API " * 300]},
        ).status_code
        == 422
    )


def test_unsupported_and_ambiguous_roles_preserved(client: TestClient):
    unsup = client.post("/generate", json={"target_role": "Head Pastry Chef"})
    assert unsup.status_code == 200
    assert unsup.json()["valid"] is False
    assert unsup.json()["error_code"] == "UNSUPPORTED_ROLE"

    ambig = client.post("/generate", json={"target_role": "Software Programmer"})
    assert ambig.status_code == 200
    assert ambig.json()["valid"] is False
    assert ambig.json()["error_code"] in {"AMBIGUOUS_ROLE", "UNSUPPORTED_ROLE"}


def test_engine_reused_across_requests(client: TestClient):
    engine_before = app.state.engine
    model_id_before = id(engine_before._model)
    r1 = client.post("/generate", json={"target_role": "Data Analyst"})
    r2 = client.post("/generate", json={"target_role": "Machine Learning Engineer"})
    assert r1.status_code == 200 and r2.status_code == 200
    assert app.state.engine is engine_before
    assert id(app.state.engine._model) == model_id_before


def test_simulated_inference_failure_returns_sanitized_500(client: TestClient, monkeypatch):
    def boom(*_args, **_kwargs):
        raise RuntimeError("Simulated crash at D:/secret/internal/path")

    monkeypatch.setattr(app.state.engine, "generate_roadmap", boom)
    resp = client.post("/generate", json={"target_role": "Data Scientist"})
    assert resp.status_code == 500
    body = resp.json()
    assert body["error_code"] == "INTERNAL_ERROR"
    assert "Traceback" not in resp.text
    assert "D:/secret/internal/path" not in resp.text
