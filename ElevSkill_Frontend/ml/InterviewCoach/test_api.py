"""
Automated API tests for CareerPilot AI — Phase 3D-3 Interview Coach FastAPI Service.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import app, create_app


BEHAVIORAL_ANSWER = (
    "During my capstone project, our course planner stopped syncing saved schedules right before demo day. "
    "My task was to identify the root cause and fix it within one day. "
    "I reproduced the bug locally, inspected storage writes, and wrote unit tests that caught a stale state overwrite. "
    "As a result, the sync bug was resolved and our team delivered the demo on time."
)

FRONTEND_ANSWER = (
    "In React, props are read-only inputs passed from a parent component to a child, whereas state is managed "
    "internally and updated with a setter like useState, triggering a re-render. For example, when two sibling "
    "filter components need the same search query, we lift that state up to their common parent component."
)

DSA_ANSWER = (
    "Big O describes how time and memory space grow as the input size n increases. For example, looking up "
    "a key in a hash map takes O(1) constant time, whereas scanning an unsorted array takes O(n) linear time. "
    "Choosing O(1) lookups over nested loops keeps pages responsive as datasets scale."
)

GENERAL_ANSWER = (
    "I am interested in this entry-level role because my coursework and React projects align with building "
    "user-facing web tools. In my internship, I learned fastest in a collaborative team with code reviews, "
    "and my goal is to take ownership of features early."
)


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


def test_evaluate_behavioral_answer_with_star(client: TestClient):
    resp = client.post(
        "/evaluate",
        json={
            "answer_text": BEHAVIORAL_ANSWER,
            "category": "behavioral",
            "question_id": "beh-1",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["category"] == "behavioral"
    assert 0 <= data["overall_score"] <= 100
    assert data["star_assessment"] is not None
    assert set(data["star_assessment"].keys()) == {"situation", "task", "action", "result"}
    assert "star_completeness" in data["dimension_scores"]
    assert "D:\\" not in str(data)


def test_evaluate_frontend_answer_without_star(client: TestClient):
    resp = client.post(
        "/evaluate",
        json={
            "answer_text": FRONTEND_ANSWER,
            "category": "frontend",
            "question_id": "fe-1",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["category"] == "frontend"
    assert data["star_assessment"] is None
    assert "conceptual_understanding" in data["dimension_scores"]
    assert len(data["covered_concepts"]) >= 1


def test_evaluate_dsa_answer_without_star(client: TestClient):
    resp = client.post(
        "/evaluate",
        json={
            "answer_text": DSA_ANSWER,
            "category": "dsa",
            "question_id": "dsa-1",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["category"] == "dsa"
    assert data["star_assessment"] is None
    assert "completeness" in data["dimension_scores"]


def test_evaluate_general_answer_with_star(client: TestClient):
    resp = client.post(
        "/evaluate",
        json={
            "answer_text": GENERAL_ANSWER,
            "category": "general",
            "question_id": "gen-2",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["category"] == "general"
    assert data["star_assessment"] is not None


def test_empty_and_whitespace_answers_return_422(client: TestClient):
    for bad in ["", "   \n\t  "]:
        resp = client.post(
            "/evaluate",
            json={"answer_text": bad, "category": "frontend", "question_id": "fe-1"},
        )
        assert resp.status_code == 422


def test_missing_fields_invalid_category_and_types_return_422(client: TestClient):
    # Missing answer_text
    assert client.post("/evaluate", json={"category": "frontend", "question_id": "fe-1"}).status_code == 422
    # Missing question_text and question_id
    assert client.post("/evaluate", json={"answer_text": FRONTEND_ANSWER, "category": "frontend"}).status_code == 422
    # Invalid category
    assert (
        client.post(
            "/evaluate",
            json={"answer_text": FRONTEND_ANSWER, "category": "finance", "question_text": "Tell me about finance."},
        ).status_code
        == 422
    )
    # Invalid input type
    assert (
        client.post(
            "/evaluate",
            json={"answer_text": 99999, "category": "frontend", "question_id": "fe-1"},
        ).status_code
        == 422
    )


def test_overlong_answer_returns_422(client: TestClient):
    too_long = "React state and props " * 400  # > 6,000 chars
    resp = client.post(
        "/evaluate",
        json={"answer_text": too_long, "category": "frontend", "question_id": "fe-1"},
    )
    assert resp.status_code == 422


def test_repeated_requests_reuse_engine_and_model(client: TestClient):
    engine_before = app.state.engine
    model_id_before = id(engine_before._model)
    r1 = client.post(
        "/evaluate",
        json={"answer_text": FRONTEND_ANSWER, "category": "frontend", "question_id": "fe-1"},
    )
    r2 = client.post(
        "/evaluate",
        json={"answer_text": DSA_ANSWER, "category": "dsa", "question_id": "dsa-1"},
    )
    assert r1.status_code == 200 and r2.status_code == 200
    assert app.state.engine is engine_before
    assert id(app.state.engine._model) == model_id_before


def test_model_loading_failure_returns_degraded_and_503():
    broken_app = create_app(model_name_or_path="D:/nonexistent/path/missing-interview-model")
    with TestClient(broken_app) as broken_client:
        h = broken_client.get("/health")
        assert h.status_code == 200
        assert h.json()["status"] == "degraded"
        assert h.json()["model_loaded"] is False
        assert h.json()["offline_available"] is False

        resp = broken_client.post(
            "/evaluate",
            json={"answer_text": FRONTEND_ANSWER, "category": "frontend", "question_id": "fe-1"},
        )
        assert resp.status_code == 503
        assert resp.json()["error_code"] == "MODEL_UNAVAILABLE"
        assert "Traceback" not in resp.text
        assert "D:/nonexistent" not in resp.text


def test_runtime_inference_failure_returns_503_without_stacktrace(client: TestClient, monkeypatch):
    def boom(*_args, **_kwargs):
        raise RuntimeError("Simulated internal tensor failure at C:/secret/path")

    monkeypatch.setattr(app.state.engine, "evaluate", boom)
    resp = client.post(
        "/evaluate",
        json={"answer_text": FRONTEND_ANSWER, "category": "frontend", "question_id": "fe-1"},
    )
    assert resp.status_code == 503
    body = resp.json()
    assert body["error_code"] == "INFERENCE_UNAVAILABLE"
    assert "Traceback" not in resp.text
    assert "C:/secret/path" not in resp.text


def test_regression_python_two_sum_merge_intervals_and_behavioral(client: TestClient):
    # Python list vs tuple: must NOT give React example
    r_py = client.post(
        "/evaluate",
        json={
            "category": "python",
            "question_text": "What is the difference between a list and a tuple in Python, and when would you use each?",
            "answer_text": "A list uses square brackets and is mutable so you can add, remove, and modify elements. A tuple uses parentheses and is immutable, so you use it for fixed data.",
        },
    )
    assert r_py.status_code == 200
    d_py = r_py.json()
    assert d_py["overall_score"] >= 60
    assert "react" not in d_py["illustrative_example"].lower()

    # Logic Two Sum with code submission
    r_ts = client.post(
        "/evaluate",
        json={
            "category": "logic",
            "question_text": "How would you find two numbers that add up to a target efficiently?",
            "expected_concepts": ["brute force O(n^2)", "hash map O(n)", "complement lookup", "time and space complexity"],
            "answer_text": "def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        comp = target - num\n        if comp in seen:\n            return [seen[comp], i]\n        seen[num] = i",
        },
    )
    assert r_ts.status_code == 200
    d_ts = r_ts.json()
    assert any("hash" in c.lower() or "complement" in c.lower() for c in d_ts["covered_concepts"])
    assert "react" not in d_ts["illustrative_example"].lower()

    # Logic Merge Intervals: must NOT give React example
    r_mi = client.post(
        "/evaluate",
        json={
            "category": "logic",
            "question_text": "How do you merge overlapping intervals?",
            "expected_concepts": ["sort by start time", "compare current start with previous end", "max end value", "O(n log n) time complexity"],
            "answer_text": "First sort intervals by start time, then compare each current start against the previous merged end and merge using the maximum end value.",
        },
    )
    assert r_mi.status_code == 200
    assert "react" not in r_mi.json()["illustrative_example"].lower()

    # Behavioral AI-service outage STAR response
    r_beh = client.post(
        "/evaluate",
        json={
            "category": "behavioral",
            "question_id": "beh-1",
            "answer_text": (
                "During our final integration phase (Situation), an AI service went down and blocked evaluations (Task). "
                "I inspected the health endpoints and server logs, traced the root cause, added graceful Express 503 error handling, "
                "and restarted the worker (Action). As a result, uptime was restored within minutes and users received clear status feedback (Result)."
            ),
        },
    )
    assert r_beh.status_code == 200
    assert r_beh.json()["overall_score"] >= 65


def test_theoretical_os_answer_does_not_trigger_code_feedback(client: TestClient):
    resp = client.post(
        "/evaluate",
        json={
            "category": "os",
            "question_text": "What are the four Coffman conditions for a Deadlock, and how can you prevent one?",
            "expected_concepts": ["mutual exclusion", "hold and wait", "no preemption", "circular wait"],
            "answer_text": (
                "Deadlock requires four Coffman conditions for a deadlock in an operating system: "
                "mutual exclusion, hold and wait while waiting for another resource, no preemption, "
                "and circular wait. To prevent deadlock, you can enforce a strict resource ordering "
                "so processes never return to earlier locks or hold one resource while requesting another."
            ),
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    joined_strengths = " ".join(data["strengths"]).lower()
    joined_suggestions = " ".join(data["improvement_suggestions"]).lower()
    assert "executable code solution" not in joined_strengths
    assert "time and space complexity" not in joined_suggestions


def test_legitimate_code_submission_still_detected_in_coding_category(client: TestClient):
    resp = client.post(
        "/evaluate",
        json={
            "category": "python",
            "question_text": "Write a Python function to find two numbers that sum to a target.",
            "expected_concepts": ["hash map", "single pass", "O(n)"],
            "answer_text": (
                "def two_sum(nums, target):\n"
                "    seen = {}\n"
                "    for i, num in enumerate(nums):\n"
                "        diff = target - num\n"
                "        if diff in seen:\n"
                "            return [seen[diff], i]\n"
                "        seen[num] = i\n"
                "    return []"
            ),
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert any("executable code solution" in s.lower() for s in data["strengths"])


def test_csharp_i_dont_know_answer_does_not_false_credit_concepts(client: TestClient):
    resp = client.post(
        "/evaluate",
        json={
            "category": "csharp",
            "question_text": "What is the difference between value types (struct) and reference types (class) in C#?",
            "expected_concepts": [
                "structs are value types stored inline/stack while classes are reference types on the heap",
                "structs cannot inherit from other structs or classes",
                "classes support inheritance and polymorphism",
            ],
            "answer_text": "struct is i don't know and class also i don't know",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["covered_concepts"] == []
    assert "structs cannot inherit from other structs or classes" in data["missing_concepts"]
    assert data["overall_score"] < 40


def test_motivation_question_avoids_star_penalty_while_conflict_uses_star(client: TestClient):
    # 1. Motivation / preference question (gen-1)
    r_mot = client.post(
        "/evaluate",
        json={
            "category": "general",
            "question_id": "gen-1",
            "answer_text": (
                "I am excited about this entry-level role because it lets me apply my React and Python "
                "fundamentals to real user-facing products while learning from senior engineers. "
                "I learn fastest in collaborative teams with constructive code reviews, clear mentorship, "
                "pair debugging, and ownership over small end-to-end features."
            ),
        },
    )
    assert r_mot.status_code == 200
    d_mot = r_mot.json()
    assert d_mot["star_assessment"] is None
    assert "role_alignment" in d_mot["dimension_scores"]
    assert "star_completeness" not in d_mot["dimension_scores"]
    assert d_mot["dimension_scores"]["role_alignment"] >= 18
    assert d_mot["overall_score"] >= 70
    assert not any("strengthen star" in s.lower() for s in d_mot["improvement_suggestions"])

    # 2. Past-conflict behavioral question (beh-2) still requires STAR
    r_conf = client.post(
        "/evaluate",
        json={
            "category": "behavioral",
            "question_id": "beh-2",
            "answer_text": (
                "During our capstone project (Situation), two teammates disagreed on whether to use REST or GraphQL (Task). "
                "I organized a short comparison of both approaches against our 3-week deadline and proposed REST (Action). "
                "The team aligned quickly and shipped all endpoints on time (Result)."
            ),
        },
    )
    assert r_conf.status_code == 200
    d_conf = r_conf.json()
    assert d_conf["star_assessment"] is not None
    assert "star_completeness" in d_conf["dimension_scores"]

    # 3. Question-answer mismatch detection preserved
    r_mis = client.post(
        "/evaluate",
        json={
            "category": "behavioral",
            "question_id": "beh-2",
            "answer_text": "My favorite food is pizza with extra cheese and fresh basil leaves.",
        },
    )
    assert r_mis.status_code == 200
    assert r_mis.json()["overall_score"] < 45
