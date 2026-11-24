"""
Automated API tests for CareerPilot AI — Phase 3B FastAPI Resume Analyzer Service.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import app, create_app


SAMPLE_RESUME = (
    "grad@university.edu | github.com/student-dev\n\n"
    "Education\n"
    "B.S. in Computer Science, State University (2026)\n\n"
    "Experience\n"
    "Frontend Intern — Campus Tech Lab\n"
    "- Built reusable React UI components with JavaScript and CSS3 for 400+ students.\n"
    "- Integrated REST APIs and collaborated via Git pull requests.\n\n"
    "Projects\n"
    "- StudyTrack: Implemented responsive dashboard with Vite and Vitest unit tests.\n\n"
    "Skills\n"
    "JavaScript, React, HTML5, CSS3, REST API, Git, Vite, Vitest\n"
)

SAMPLE_JD = (
    "Junior Frontend Developer\n"
    "Looking for a Computer Science graduate with React, JavaScript, HTML5, CSS3, "
    "REST API integration, Git, and Vitest testing experience."
)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert "all-MiniLM-L6-v2" in data["model_source"]


def test_analyze_valid_resume_without_jd(client: TestClient):
    resp = client.post("/analyze", json={"resume_text": SAMPLE_RESUME})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert isinstance(data["overall_score"], int)
    assert 0 <= data["overall_score"] <= 100
    assert "React" in data["skills_analysis"]["detected_skills"]
    assert data["semantic_relevance"] is None


def test_analyze_valid_resume_with_jd(client: TestClient):
    resp = client.post(
        "/analyze",
        json={"resume_text": SAMPLE_RESUME, "job_description": SAMPLE_JD},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["semantic_relevance"] is not None
    assert data["semantic_relevance"]["overall_similarity"] > 0.5
    assert "lexical_tfidf_similarity" in data["semantic_relevance"]
    assert len(data["strengths"]) > 0


def test_analyze_empty_and_whitespace_resume(client: TestClient):
    for bad_text in ["", "   \n\t  "]:
        resp = client.post("/analyze", json={"resume_text": bad_text})
        assert resp.status_code == 422


def test_analyze_missing_fields_and_invalid_types(client: TestClient):
    r_missing = client.post("/analyze", json={"job_description": SAMPLE_JD})
    assert r_missing.status_code == 422

    r_type = client.post("/analyze", json={"resume_text": 12345})
    assert r_type.status_code == 422


def test_analyze_very_long_input(client: TestClient):
    too_long = "Python React JavaScript " * 1500  # > 25,000 chars
    r_too_long = client.post("/analyze", json={"resume_text": too_long})
    assert r_too_long.status_code == 422

    near_limit = ("Python React JavaScript built web apps. " * 500)[:24000]
    r_ok = client.post("/analyze", json={"resume_text": near_limit})
    assert r_ok.status_code == 200
    assert r_ok.json()["valid"] is True


def test_repeated_requests_reuse_loaded_model(client: TestClient):
    model_id_before = id(app.state.engine._model)
    r1 = client.post("/analyze", json={"resume_text": SAMPLE_RESUME})
    r2 = client.post(
        "/analyze",
        json={"resume_text": SAMPLE_RESUME, "job_description": SAMPLE_JD},
    )
    model_id_after = id(app.state.engine._model)
    assert r1.status_code == 200 and r2.status_code == 200
    assert model_id_before == model_id_after


def test_model_loading_failure_returns_503_without_stacktrace():
    broken_app = create_app(model_name_or_path="D:/nonexistent/path/invalid-model-xyz")
    with TestClient(broken_app) as broken_client:
        h = broken_client.get("/health")
        assert h.status_code == 200
        assert h.json()["status"] == "degraded"
        assert h.json()["model_loaded"] is False

        resp = broken_client.post("/analyze", json={"resume_text": SAMPLE_RESUME})
        assert resp.status_code == 503
        body = resp.json()
        assert body["error_code"] == "MODEL_UNAVAILABLE"
        assert "Traceback" not in resp.text


def test_recommendations_are_deduplicated_for_links(client: TestClient):
    resp = client.post(
        "/analyze",
        json={
            "resume_text": (
                "Alex Candidate\nSummary\nBuilt web applications with React, JavaScript, Node.js, and SQL.\n"
                "Projects\n- Created a task tracker app using React and REST APIs.\n"
                "Education\nB.S. Computer Science"
            )
        },
    )
    assert resp.status_code == 200
    recs = resp.json()["recommendations"]
    assert len(recs) == len(set(recs))
    link_recs = [r for r in recs if "github" in r.lower() or "linkedin" in r.lower()]
    assert len(link_recs) <= 1


def test_skill_extraction_python_c_ml_dbms_react_and_github_url(client: TestClient):
    base_resume = (
        "Priya Sharma\n"
        "priya@example.edu | github.com/priyasharma\n"
        "Technical Skills\n"
        "Python, C, Machine Learning, DBMS\n"
        "Projects\n"
        "- Built an interactive student dashboard using React.\n"
        "Education\n"
        "B.Tech Computer Science, 2026"
    )
    resp = client.post("/analyze", json={"resume_text": base_resume})
    assert resp.status_code == 200
    data = resp.json()
    detected = set(data["skills_analysis"]["detected_skills"])
    assert {"Python", "C", "Machine Learning", "DBMS", "React"}.issubset(detected)
    assert "Git" not in detected
    assert data["contact_info"]["has_links"] is True

    # Skills score increases when C, Machine Learning, DBMS, and React are present vs Python alone
    minimal_resume = (
        "Priya Sharma\n"
        "priya@example.edu | github.com/priyasharma\n"
        "Technical Skills\n"
        "Python\n"
        "Education\n"
        "B.Tech Computer Science, 2026"
    )
    min_resp = client.post("/analyze", json={"resume_text": minimal_resume})
    assert min_resp.status_code == 200
    assert data["score_breakdown"]["skills_score"] > min_resp.json()["score_breakdown"]["skills_score"]


def test_git_detected_when_explicitly_mentioned(client: TestClient):
    resume = (
        "Alex Rivera\n"
        "alex@example.edu\n"
        "Technical Skills\n"
        "Python, Git\n"
        "Projects\n"
        "- Collaborated on feature branches using Git workflows.\n"
        "Education\n"
        "B.S. Software Engineering"
    )
    resp = client.post("/analyze", json={"resume_text": resume})
    assert resp.status_code == 200
    detected = set(resp.json()["skills_analysis"]["detected_skills"])
    assert "Git" in detected


def test_c_and_ml_negative_guards_and_c_cpp_pair(client: TestClient):
    neg_resume = (
        "Jordan Lee\n"
        "jordan@example.edu\n"
        "Technical Skills\n"
        "C++, C#, Objective-C, HTML\n"
        "Summary\n"
        "Selected Option C in coursework review.\n"
        "Education\n"
        "B.S. Computer Science"
    )
    neg_resp = client.post("/analyze", json={"resume_text": neg_resume})
    assert neg_resp.status_code == 200
    neg_detected = set(neg_resp.json()["skills_analysis"]["detected_skills"])
    assert {"C++", "C#", "HTML5"}.issubset(neg_detected)
    assert "C" not in neg_detected
    assert "Machine Learning" not in neg_detected

    pair_resume = (
        "Jordan Lee\n"
        "jordan@example.edu\n"
        "Technical Skills\n"
        "C/C++, Python\n"
        "Education\n"
        "B.S. Computer Science"
    )
    pair_resp = client.post("/analyze", json={"resume_text": pair_resume})
    assert pair_resp.status_code == 200
    pair_detected = set(pair_resp.json()["skills_analysis"]["detected_skills"])
    assert {"C", "C++", "Python"}.issubset(pair_detected)


def test_internship_experience_heading_and_evidence_recognized(client: TestClient):
    resume_with_heading = (
        "Rahul Sharma\n"
        "rahul@example.com | github.com/rahulsharma\n"
        "Education\n"
        "B.Tech Computer Science, Example University (2025)\n"
        "Internship Experience\n"
        "Software Engineer Intern at Example Labs (May 2024 - Aug 2024)\n"
        "- Built REST APIs with Python, FastAPI, React, and SQL.\n"
        "Projects\n"
        "Portfolio App built with React and JavaScript.\n"
        "Technical Skills\n"
        "Python, JavaScript, React, SQL, Git\n"
    )
    resp = client.post("/analyze", json={"resume_text": resume_with_heading})
    assert resp.status_code == 200
    data = resp.json()
    assert data["section_assessment"]["experience"]["status"] == "present"
    assert "experience" not in data["missing_sections"]
    joined_recs = " ".join(data["recommendations"]).lower()
    assert "add internship" not in joined_recs
    assert "missing 'experience'" not in " ".join(data["areas_for_improvement"]).lower()

    resume_unheaded_intern = (
        "Rahul Sharma\n"
        "rahul@example.com\n"
        "Education\n"
        "B.Tech Computer Science, Example University (2025)\n"
        "Software Engineer Intern at Example Labs (May 2024 - Aug 2024) building FastAPI and SQL services.\n"
        "Projects\n"
        "Portfolio App built with React and JavaScript for student collaboration.\n"
        "Skills\n"
        "Python, JavaScript, React, SQL, Git\n"
    )
    resp2 = client.post("/analyze", json={"resume_text": resume_unheaded_intern})
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["section_assessment"]["experience"]["status"] == "present"
    assert "add internship" not in " ".join(data2["recommendations"]).lower()


def test_extract_pdf_preserves_response_contract_and_handles_invalid_pdf(client: TestClient):
    # Minimal valid PDF 1.4 with selectable text
    stream_data = b"BT /F1 12 Tf 72 720 Td (Rahul Sharma Software Engineer Intern) Tj ET"
    pdf_parts = [
        b"%PDF-1.4\n",
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
        f"4 0 obj << /Length {len(stream_data)} >>\nstream\n".encode("ascii")
        + stream_data
        + b"\nendstream\nendobj\n",
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    ]
    offsets = []
    body = bytearray()
    for part in pdf_parts:
        offsets.append(len(body))
        body.extend(part)
    xref_pos = len(body)
    body.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode("ascii"))
    for off in offsets[1:]:
        body.extend(f"{off:010d} 00000 n \n".encode("ascii"))
    body.extend(
        f"trailer << /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii")
    )

    resp = client.post(
        "/extract-pdf",
        files={"file": ("sample_resume.pdf", bytes(body), "application/pdf")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) == {"filename", "page_count", "extracted_text", "char_count"}
    assert data["filename"] == "sample_resume.pdf"
    assert data["page_count"] == 1
    assert "Rahul Sharma" in data["extracted_text"]
    assert data["char_count"] == len(data["extracted_text"])

    bad_resp = client.post(
        "/extract-pdf",
        files={"file": ("bad.txt", b"not a pdf", "text/plain")},
    )
    assert bad_resp.status_code == 422
    assert bad_resp.json()["error_code"] == "INVALID_FILE_TYPE"


def test_contact_line_not_flagged_as_non_action_bullet(client: TestClient):
    resume = (
        "Aarav Mehta\n"
        "Bengaluru, India | +91 98000 11223 | aarav.mehta@example.com | github.com/aaravmehta\n\n"
        "Experience\n"
        "Frontend Intern at Campus Lab (2025)\n"
        "- Built 12 reusable React components for student planner.\n\n"
        "Education\n"
        "B.Tech Computer Science (2026)"
    )
    resp = client.post("/analyze", json={"resume_text": resume})
    assert resp.status_code == 200
    data = resp.json()
    non_action = " ".join(data["quality_analysis"]["non_action_bullets"]).lower()
    assert "aarav.mehta@example.com" not in non_action
    assert "98000" not in non_action


def test_summary_paragraph_not_flagged_as_bullet_while_weak_bullets_preserved(client: TestClient):
    student_resume = (
        "Ritu Sharma\n"
        "Jaipur, India | ritu.sharma@example.com\n\n"
        "Summary\n"
        "Motivated computer science undergraduate passionate about learning modern software engineering and building reliable user interfaces.\n\n"
        "Education\n"
        "B.Sc. Computer Science (2025)\n\n"
        "Projects\n"
        "- Did a college website project using HTML and CSS.\n"
        "- Worked on a database assignment in MySQL.\n"
    )
    resp = client.post("/analyze", json={"resume_text": student_resume})
    assert resp.status_code == 200
    data = resp.json()
    non_action = " ".join(data["quality_analysis"]["non_action_bullets"]).lower()
    weak = " ".join(data["quality_analysis"]["weak_bullets"]).lower()
    assert "motivated computer science undergraduate" not in non_action
    assert "did a college website" in weak or "did a college website" in non_action

    experienced_resume = (
        "Vikram Desai\n"
        "vikram.desai@example.com | github.com/vikramdesai\n\n"
        "Summary\n"
        "Backend Developer with 2 years of experience designing scalable REST APIs, relational schemas, and containerized microservices.\n\n"
        "Experience\n"
        "Backend Engineer — CloudCart (2024 - Present)\n"
        "- Designed 18 FastAPI endpoints backed by PostgreSQL handling 400+ requests per minute.\n"
        "- Optimized slow SQL joins cutting checkout latency by 35%.\n\n"
        "Education\n"
        "B.E. Information Technology (2024)"
    )
    resp2 = client.post("/analyze", json={"resume_text": experienced_resume})
    assert resp2.status_code == 200
    data2 = resp2.json()
    non_action2 = " ".join(data2["quality_analysis"]["non_action_bullets"]).lower()
    assert "backend developer with 2 years" not in non_action2
