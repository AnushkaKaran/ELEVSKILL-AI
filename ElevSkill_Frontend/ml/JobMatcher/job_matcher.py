"""
CareerPilot AI — Phase 3E-2: Hybrid NLP/ML Job Matcher Engine
==============================================================
Locally executable, privacy-preserving job-to-profile matcher combining:
  1. Boundary-aware, disambiguated technical skill extraction
  2. Required / preferred / uncertain job requirement classification
  3. Pretrained Transformer sentence embeddings for semantic relevance & evidence retrieval
  4. Education & qualification alignment
  5. Configurable 5-dimension scoring normalized strictly over applicable dimensions

Note: Scores represent profile-to-job alignment only — NOT hiring probability.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("careerpilot.job_matcher")
logger.addHandler(logging.NullHandler())

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
RESUME_MINILM_DIR = BASE_DIR.parent / "ResumeAnalyzer" / "models" / "all-MiniLM-L6-v2"
INTERVIEW_MINILM_DIR = BASE_DIR.parent / "InterviewCoach" / "models" / "all-MiniLM-L6-v2"

MAX_TEXT_CHARS = 25_000
MIN_JD_WORDS = 6

DEFAULT_WEIGHTS: Dict[str, float] = {
    "required_skill_coverage": 0.35,
    "semantic_relevance": 0.30,
    "project_experience_alignment": 0.15,
    "preferred_skill_coverage": 0.10,
    "education_qualification_alignment": 0.10,
}

# Categorized technical skill taxonomy with disambiguation rules
SKILL_TAXONOMY: Dict[str, Dict[str, List[str]]] = {
    "languages": {
        "Python": ["python"],
        "JavaScript": ["javascript", "es6", "ecmascript"],
        "TypeScript": ["typescript"],
        "Java": ["java", "jdk", "jvm"],
        "C++": ["c++", "cpp"],
        "C#": ["c#", "csharp"],
        "C": ["c programming", "ansi c", "c language", "c"],
        "Go": ["golang"],
        "Rust": ["rust"],
        "SQL": ["sql", "tsql", "plsql"],
        "HTML5": ["html", "html5"],
        "CSS3": ["css", "css3", "scss", "sass"],
        "Kotlin": ["kotlin"],
        "Swift": ["swift"],
    },
    "frameworks": {
        "React": ["react", "reactjs", "react.js"],
        "React Native": ["react native"],
        "Next.js": ["next.js", "nextjs"],
        "Vue.js": ["vue", "vuejs", "vue.js"],
        "Angular": ["angular"],
        "Node.js": ["node.js", "nodejs", "node js", "node"],
        "Express": ["express", "expressjs", "express.js"],
        "FastAPI": ["fastapi"],
        "Django": ["django"],
        "Flask": ["flask"],
        "Spring Boot": ["spring boot", "springboot"],
        "Tailwind CSS": ["tailwind", "tailwindcss"],
        "PyTorch": ["pytorch"],
        "TensorFlow": ["tensorflow"],
        "scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
        "Pandas": ["pandas"],
        "NumPy": ["numpy"],
    },
    "databases": {
        "PostgreSQL": ["postgresql", "postgres"],
        "MySQL": ["mysql"],
        "SQLite": ["sqlite"],
        "MongoDB": ["mongodb"],
        "NoSQL": ["nosql", "no-sql"],
        "Redis": ["redis"],
        "Firebase": ["firebase", "firestore"],
        "DynamoDB": ["dynamodb"],
    },
    "ml_and_concepts": {
        "Machine Learning": ["machine learning"],
        "Deep Learning": ["deep learning"],
        "NLP": ["natural language processing", "nlp"],
        "LLMs": ["large language models", "large language model", "llms", "llm"],
        "Statistics": ["statistical analysis", "statistics", "probability"],
        "Data Preprocessing": ["data preprocessing", "preprocessing", "data cleaning", "feature engineering"],
        "Exploratory Data Analysis": ["exploratory data analysis", "eda"],
        "Data Visualization": ["data visualization", "visualization", "matplotlib", "seaborn"],
        "REST API": ["rest api integration", "rest apis", "rest api", "restful"],
        "GraphQL": ["graphql"],
        "WCAG Accessibility": ["wcag accessibility", "web accessibility", "wcag", "accessibility", "a11y"],
        "Code Review": ["collaborative code reviews", "code reviews", "code review"],
    },
    "tools": {
        "Git": ["git", "github", "gitlab"],
        "Docker": ["docker"],
        "Kubernetes": ["kubernetes", "k8s"],
        "AWS": ["aws", "amazon web services"],
        "GCP": ["gcp", "google cloud"],
        "Azure": ["azure"],
        "Power BI": ["power bi", "powerbi"],
        "Tableau": ["tableau"],
        "Vite": ["vite"],
        "Vitest": ["vitest"],
        "Jest": ["jest"],
        "Pytest": ["pytest"],
        "Linux": ["linux", "ubuntu", "bash"],
        "CI/CD": ["ci/cd", "github actions", "jenkins"],
        "Figma": ["figma"],
    },
}

# Longer/compound phrases must be masked before matching shorter ambiguous tokens
DISAMBIGUATION_MASKS = [
    ("React Native", ["react native"]),
    ("JavaScript", ["javascript"]),
    ("NoSQL", ["nosql", "no-sql"]),
    ("Deep Learning", ["deep learning"]),
    ("Machine Learning", ["machine learning"]),
    ("Exploratory Data Analysis", ["exploratory data analysis"]),
    ("Data Preprocessing", ["data preprocessing"]),
    ("Data Visualization", ["data visualization"]),
    ("WCAG Accessibility", ["wcag accessibility", "web accessibility"]),
    ("Code Review", ["collaborative code reviews", "code reviews", "code review"]),
    ("Power BI", ["power bi", "powerbi"]),
    ("REST API", ["rest api integration", "rest apis", "rest api", "restful"]),
    ("C++", ["c++"]),
    ("C#", ["c#"]),
    ("CSS3", ["css3", "css"]),
    ("CI/CD", ["ci/cd"]),
    ("PostgreSQL", ["postgresql"]),
    ("MySQL", ["mysql"]),
    ("SQLite", ["sqlite"]),
]

PREFERRED_SECTION_RE = re.compile(
    r"\b(preferred|bonus|nice to have|optional|plus|desirable)\b", re.I
)
REQUIRED_SECTION_RE = re.compile(
    r"\b(required|requirements|must have|minimum qualifications|essential|qualifications)\b", re.I
)
EDUCATION_RE = re.compile(
    r"\b(b\.?s\.?|b\.?tech|b\.?e\.?|m\.?s\.?|bachelor|master|degree|computer science|engineering|graduate|student|internship|entry[- ]level|junior)\b",
    re.I,
)


def _resolve_default_model_source() -> str:
    for candidate in [
        MODELS_DIR / "all-MiniLM-L6-v2",
        MODELS_DIR / "bge-small-en-v1.5",
        RESUME_MINILM_DIR,
        INTERVIEW_MINILM_DIR,
    ]:
        if candidate.exists():
            return str(candidate)
    return "sentence-transformers/all-MiniLM-L6-v2"


class JobMatcherEngine:
    """Five-dimensional semantic + skill-aware Job Matcher engine."""

    def __init__(
        self,
        model_name_or_path: Optional[str] = None,
        weights: Optional[Dict[str, float]] = None,
    ) -> None:
        self.model_source = model_name_or_path or _resolve_default_model_source()
        self.weights = {**DEFAULT_WEIGHTS, **(weights or {})}
        self._model = None

    def _get_model(self):
        if self._model is None:
            import gc
            import torch
            from sentence_transformers import SentenceTransformer

            torch.set_num_threads(1)
            is_local = Path(self.model_source).exists()
            logger.info("Loading JobMatcher model from %s", self.model_source)
            self._model = SentenceTransformer(
                self.model_source,
                device="cpu",
                local_files_only=is_local,
                model_kwargs={"low_cpu_mem_usage": True},
            )
            gc.collect()
        return self._model

    @staticmethod
    def _clean_text(text: str, max_chars: int = MAX_TEXT_CHARS) -> Tuple[str, bool]:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n")
        normalized = re.sub(r"[ \t]+", " ", normalized)
        normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip()
        truncated = len(normalized) > max_chars
        if truncated:
            normalized = normalized[:max_chars]
        return normalized, truncated

    @staticmethod
    def extract_skills(text: str) -> List[str]:
        """Boundary-aware, disambiguated skill extraction preventing substring false positives."""
        if not text or not text.strip():
            return []

        lower = text.lower()
        found: List[str] = []

        # First pass: detect compound/special-char skills and mask them so shorter tokens
        # (e.g., 'c' vs 'c++'/'css', 'java' vs 'javascript', 'sql' vs 'nosql'/'mysql', 'react' vs 'react native')
        # cannot false-match inside them.
        masked = lower
        for canonical, phrases in DISAMBIGUATION_MASKS:
            for phrase in phrases:
                pat = r"(?<![a-z0-9+#.])" + re.escape(phrase) + r"(?![a-z0-9+#])(?!(?:\.[a-z0-9]))"
                if re.search(pat, masked):
                    if canonical not in found:
                        found.append(canonical)
                    masked = re.sub(pat, " ", masked)

        # Second pass on masked text for remaining skills
        for _category, skill_map in SKILL_TAXONOMY.items():
            for canonical, aliases in skill_map.items():
                if canonical in found:
                    continue
                for alias in aliases:
                    # Skip already-handled ambiguous single-token aliases if masked
                    pat = r"(?<![a-z0-9+#.])" + re.escape(alias) + r"(?![a-z0-9+#])(?!(?:\.[a-z0-9]))"
                    if re.search(pat, masked):
                        found.append(canonical)
                        break

        return found

    def _parse_job_requirements(
        self,
        jd_text: str,
        explicit_required: Optional[List[str]] = None,
        explicit_preferred: Optional[List[str]] = None,
    ) -> Dict[str, List[str]]:
        """Classifies JD skills into required, preferred, and uncertain buckets."""
        lines = [line.strip() for line in jd_text.split("\n") if line.strip()]
        req_lines: List[str] = []
        pref_lines: List[str] = []
        uncertain_lines: List[str] = []

        mode = "uncertain"
        for line in lines:
            if PREFERRED_SECTION_RE.search(line) and len(line.split()) <= 16:
                mode = "preferred"
                pref_lines.append(line)
                continue
            if REQUIRED_SECTION_RE.search(line) and len(line.split()) <= 10:
                mode = "required"
                req_lines.append(line)
                continue

            if PREFERRED_SECTION_RE.search(line):
                pref_lines.append(line)
            elif mode == "preferred":
                pref_lines.append(line)
            elif mode == "required":
                req_lines.append(line)
            else:
                uncertain_lines.append(line)

        req_skills = self.extract_skills("\n".join(req_lines))
        pref_skills = self.extract_skills("\n".join(pref_lines))
        uncertain_skills = self.extract_skills("\n".join(uncertain_lines))

        if explicit_required:
            for s in explicit_required:
                norm = self.extract_skills(s) or ([s.strip()] if s.strip() else [])
                for item in norm:
                    if item not in req_skills:
                        req_skills.append(item)

        if explicit_preferred:
            for s in explicit_preferred:
                norm = self.extract_skills(s) or ([s.strip()] if s.strip() else [])
                for item in norm:
                    if item not in pref_skills:
                        pref_skills.append(item)

        # Remove overlaps cleanly (required takes precedence over preferred/uncertain)
        pref_skills = [s for s in pref_skills if s not in req_skills]
        uncertain_skills = [
            s for s in uncertain_skills if s not in req_skills and s not in pref_skills
        ]

        # Only fall back to uncertain_skills when no explicit Required section or
        # explicit required_skills list was provided; otherwise keep incidental mentions
        # in uncertain_skills so they do not inflate missing_required_skills.
        effective_required = list(req_skills) if req_skills else list(uncertain_skills)

        return {
            "required_skills": effective_required,
            "preferred_skills": pref_skills,
            "uncertain_skills": uncertain_skills,
        }

    def _encode(self, texts: List[str]) -> np.ndarray:
        import torch

        model = self._get_model()
        with torch.inference_mode():
            return model.encode(
                texts,
                batch_size=8,
                show_progress_bar=False,
                normalize_embeddings=True,
            )

    @staticmethod
    def _scale_sim(sim: float, low: float = 0.15, high: float = 0.72) -> float:
        return float(np.clip((sim - low) / (high - low), 0.0, 1.0))

    def _extract_profile_evidence(
        self,
        profile_lines: List[Tuple[str, str]],
        jd_text: str,
        jd_skills: Optional[List[str]] = None,
        top_k: int = 3,
        jd_vec: Optional[np.ndarray] = None,
        max_evidence_lines: int = 40,
    ) -> Tuple[List[Dict[str, Any]], float]:
        """Retrieves actual user-supplied project/resume lines most relevant to the JD."""
        valid_lines = [(src, txt) for src, txt in profile_lines if len(txt.split()) >= 5]
        if not valid_lines:
            return [], 0.0

        jd_skill_set = {s.lower() for s in (jd_skills or [])}
        if len(valid_lines) > max_evidence_lines:
            # Bound line encoding to prevent memory spikes on large resumes while preserving
            # explicit project descriptions and lines containing JD-relevant skills.
            ranked_indices = sorted(
                range(len(valid_lines)),
                key=lambda i: (
                    1 if valid_lines[i][0] == "project" else 0,
                    len({s.lower() for s in self.extract_skills(valid_lines[i][1])} & jd_skill_set)
                    if jd_skill_set
                    else 0,
                    -i,
                ),
                reverse=True,
            )[:max_evidence_lines]
            ranked_indices.sort()
            valid_lines = [valid_lines[i] for i in ranked_indices]

        texts = [txt for _, txt in valid_lines]
        if jd_vec is not None:
            line_vecs = self._encode(texts)
        else:
            vecs = self._encode(texts + [jd_text])
            jd_vec = vecs[-1]
            line_vecs = vecs[:-1]

        scored = []
        for idx, (src, txt) in enumerate(valid_lines):
            sim = float(np.clip(np.dot(line_vecs[idx], jd_vec), 0.0, 1.0))
            line_skills = {s.lower() for s in self.extract_skills(txt)}
            skill_bonus = (
                min(0.15, 0.05 * len(line_skills & jd_skill_set))
                if jd_skill_set
                else 0.0
            )
            combined_sim = float(np.clip(sim + skill_bonus, 0.0, 1.0))
            scored.append({
                "text": txt[:200],
                "source": src,
                "similarity": round(combined_sim, 4),
            })

        scored.sort(key=lambda x: x["similarity"], reverse=True)
        top_evidence = scored[:top_k]
        mean_top = float(np.mean([item["similarity"] for item in top_evidence]))
        return top_evidence, self._scale_sim(mean_top, low=0.14, high=0.50)

    def match(
        self,
        profile: Optional[Dict[str, Any]],
        job: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Evaluates profile-to-job alignment across 5 transparent dimensions."""
        if not isinstance(profile, dict) or not isinstance(job, dict):
            return {
                "valid": False,
                "error": "Both profile and job objects are required.",
                "overall_match_score": 0,
            }

        raw_jd = job.get("description")
        if not isinstance(raw_jd, str) or len(raw_jd.strip().split()) < MIN_JD_WORDS:
            return {
                "valid": False,
                "error": f"Job description is insufficient (provide at least {MIN_JD_WORDS} words).",
                "overall_match_score": 0,
            }

        jd_title = str(job.get("title") or "").strip()
        jd_company = str(job.get("company") or "").strip()
        clean_jd, jd_truncated = self._clean_text(
            f"{jd_title}\n{raw_jd}".strip() if jd_title else raw_jd
        )

        # Assemble profile text strictly from supplied fields
        resume_text = str(profile.get("resume_text") or "").strip()
        explicit_skills = [
            str(s).strip() for s in (profile.get("skills") or []) if str(s).strip()
        ]
        project_descs = [
            str(p).strip()
            for p in (profile.get("project_descriptions") or [])
            if str(p).strip()
        ]
        education_text = str(profile.get("education") or "").strip()
        target_role = str(profile.get("target_role") or "").strip()
        exp_level = str(profile.get("experience_level") or "").strip()

        profile_parts = [
            p
            for p in [
                target_role,
                exp_level,
                education_text,
                " ".join(explicit_skills),
                " ".join(project_descs),
                resume_text,
            ]
            if p
        ]
        if not profile_parts:
            return {
                "valid": False,
                "error": "Profile must include resume_text, skills, or project_descriptions.",
                "overall_match_score": 0,
            }

        clean_profile, profile_truncated = self._clean_text("\n".join(profile_parts))

        # 1. Skill extraction & classification
        user_skills = self.extract_skills(
            " ".join(explicit_skills) + "\n" + " ".join(project_descs) + "\n" + resume_text
        )
        # Preserve any explicit custom skills not in taxonomy
        for s in explicit_skills:
            if not self.extract_skills(s) and s not in user_skills:
                user_skills.append(s)

        parsed_jd = self._parse_job_requirements(
            clean_jd,
            explicit_required=job.get("required_skills"),
            explicit_preferred=job.get("preferred_skills"),
        )
        req_skills = parsed_jd["required_skills"]
        pref_skills = parsed_jd["preferred_skills"]
        uncertain_skills = parsed_jd["uncertain_skills"]

        user_skill_lower = {s.lower() for s in user_skills}
        matched_required = [s for s in req_skills if s.lower() in user_skill_lower]
        missing_required = [s for s in req_skills if s.lower() not in user_skill_lower]
        matched_preferred = [s for s in pref_skills if s.lower() in user_skill_lower]
        missing_preferred = [s for s in pref_skills if s.lower() not in user_skill_lower]
        matched_all = list(dict.fromkeys(matched_required + matched_preferred))

        # 2. Semantic profile-to-job relevance
        vecs = self._encode([clean_profile, clean_jd])
        raw_sem = float(np.clip(np.dot(vecs[0], vecs[1]), 0.0, 1.0))
        jd_vec = vecs[1]
        sem_norm = self._scale_sim(raw_sem, low=0.14, high=0.72)

        # 3. Project/experience evidence
        evidence_lines: List[Tuple[str, str]] = [
            ("project", p) for p in project_descs
        ]
        if resume_text:
            for line in resume_text.split("\n"):
                cleaned_line = re.sub(r"^[-*•\d.)]+\s*", "", line).strip()
                if cleaned_line:
                    evidence_lines.append(("resume", cleaned_line))

        evidence, proj_norm = self._extract_profile_evidence(
            evidence_lines,
            clean_jd,
            jd_skills=req_skills + pref_skills,
            jd_vec=jd_vec,
        )
        has_evidence_lines = len(evidence_lines) > 0
        del vecs, jd_vec, evidence_lines
        import gc
        gc.collect()

        # 4. Education & qualification alignment (canonicalized degree levels & fields)
        def _extract_edu_signals(text_val: str) -> Tuple[int, set[str]]:
            lower_val = text_val.lower()
            degree_rank = 0
            if re.search(r"\b(ph\.?d|doctorate)\b", lower_val):
                degree_rank = 3
            elif re.search(r"\b(m\.?s\.?|m\.?sc|m\.?tech|m\.?ca|m\.?ba|master'?s?|masters)\b", lower_val):
                degree_rank = 2
            elif re.search(r"\b(b\.?s\.?|b\.?sc|b\.?tech|b\.?e\.?|b\.?ca|b\.?ba|bachelor'?s?|bachelors|undergraduate|degree)\b", lower_val):
                degree_rank = 1

            fields: set[str] = set()
            if re.search(r"\b(computer science|software engineering|information technology|computer engineering|computing|cs)\b", lower_val):
                fields.add("computing")
            if re.search(r"\b(data science|machine learning|artificial intelligence|statistics|mathematics)\b", lower_val):
                fields.add("data_ai")
            if re.search(r"\b(engineering|stem)\b", lower_val):
                fields.add("engineering")
            if re.search(r"\b(student|graduate|internship|entry[- ]level|junior|fresher)\b", lower_val):
                fields.add("entry_level")
            return degree_rank, fields

        jd_edu_hits = set(m.lower() for m in EDUCATION_RE.findall(clean_jd))
        prof_edu_text = f"{education_text} {exp_level} {resume_text}"
        prof_edu_hits = set(m.lower() for m in EDUCATION_RE.findall(prof_edu_text))
        jd_deg, jd_fields = _extract_edu_signals(clean_jd)
        prof_deg, prof_fields = _extract_edu_signals(prof_edu_text)

        edu_applicable = bool(jd_edu_hits and (education_text or exp_level or prof_edu_hits))
        if edu_applicable:
            deg_score = 1.0 if (jd_deg == 0 or prof_deg >= jd_deg) else (0.65 if prof_deg > 0 else 0.35)
            field_score = (
                1.0
                if not jd_fields or (jd_fields & prof_fields) or ("computing" in prof_fields and "engineering" in jd_fields)
                else (0.6 if prof_fields else 0.4)
            )
            edu_norm = float(np.clip(0.55 * deg_score + 0.45 * field_score, 0.0, 1.0))
        else:
            edu_norm = 0.0

        # 5. Dimension applicability & normalized weighted score
        dimensions: Dict[str, Dict[str, Any]] = {
            "required_skill_coverage": {
                "applicable": len(req_skills) > 0,
                "weight": self.weights["required_skill_coverage"],
                "raw_score": (len(matched_required) / len(req_skills)) if req_skills else None,
            },
            "semantic_relevance": {
                "applicable": True,
                "weight": self.weights["semantic_relevance"],
                "raw_score": sem_norm,
            },
            "project_experience_alignment": {
                "applicable": has_evidence_lines and len(evidence) > 0,
                "weight": self.weights["project_experience_alignment"],
                "raw_score": proj_norm if evidence else None,
            },
            "preferred_skill_coverage": {
                "applicable": len(pref_skills) > 0,
                "weight": self.weights["preferred_skill_coverage"],
                "raw_score": (len(matched_preferred) / len(pref_skills)) if pref_skills else None,
            },
            "education_qualification_alignment": {
                "applicable": edu_applicable,
                "weight": self.weights["education_qualification_alignment"],
                "raw_score": edu_norm if edu_applicable else None,
            },
        }

        excluded_dimensions = [k for k, v in dimensions.items() if not v["applicable"]]
        active_weight_sum = sum(v["weight"] for v in dimensions.values() if v["applicable"])

        weighted_sum = sum(
            v["weight"] * float(v["raw_score"])
            for v in dimensions.values()
            if v["applicable"] and v["raw_score"] is not None
        )
        overall_match_score = (
            int(round((weighted_sum / active_weight_sum) * 100))
            if active_weight_sum > 0
            else 0
        )
        overall_match_score = max(0, min(100, overall_match_score))

        dimension_scores = {
            k: {
                "applicable": v["applicable"],
                "configured_weight": v["weight"],
                "effective_weight": round(v["weight"] / active_weight_sum, 4)
                if v["applicable"] and active_weight_sum > 0
                else 0.0,
                "score_percent": round(float(v["raw_score"]) * 100, 1)
                if v["applicable"] and v["raw_score"] is not None
                else None,
            }
            for k, v in dimensions.items()
        }

        req_cov_pct = (
            round((len(matched_required) / len(req_skills)) * 100, 1)
            if req_skills
            else None
        )
        pref_cov_pct = (
            round((len(matched_preferred) / len(pref_skills)) * 100, 1)
            if pref_skills
            else None
        )

        # Grounded strengths & improvement suggestions
        strengths: List[str] = []
        suggestions: List[str] = []

        if matched_required:
            strengths.append(f"Matches {len(matched_required)}/{len(req_skills)} required job skill(s): {', '.join(matched_required[:6])}.")
        if matched_preferred:
            strengths.append(f"Matches preferred/bonus skill(s): {', '.join(matched_preferred[:4])}.")
        if sem_norm >= 0.55:
            strengths.append(f"Strong semantic alignment ({round(sem_norm * 100)}%) between your profile and the job description.")
        if evidence and evidence[0]["similarity"] >= 0.42:
            strengths.append(f"Strongest profile evidence aligns at {round(evidence[0]['similarity'] * 100)}% with job requirements.")

        if missing_required:
            suggestions.append(
                f"Address missing required skill(s) if you have them or add to your roadmap: {', '.join(missing_required[:6])}."
            )
        if missing_preferred:
            suggestions.append(
                f"Optional/preferred skill(s) not found in your profile: {', '.join(missing_preferred[:5])}."
            )
        if not evidence:
            suggestions.append("Add project or experience bullet points to evaluate project-to-job alignment.")
        if not edu_applicable and jd_edu_hits:
            suggestions.append("Add your current education or degree details to evaluate qualification alignment.")

        role_label = f" for {jd_title}" if jd_title else ""
        company_label = f" at {jd_company}" if jd_company else ""
        explanation = (
            f"Overall alignment score is {overall_match_score}/100{role_label}{company_label}, "
            f"computed across {len(dimensions) - len(excluded_dimensions)} applicable dimension(s) "
            f"(semantic profile relevance: {round(sem_norm * 100)}%"
            + (f", required skills: {len(matched_required)}/{len(req_skills)}" if req_skills else "")
            + ")."
        )

        return {
            "valid": True,
            "overall_match_score": overall_match_score,
            "dimension_scores": dimension_scores,
            "semantic_relevance": round(sem_norm, 4),
            "required_skill_coverage": req_cov_pct,
            "preferred_skill_coverage": pref_cov_pct,
            "matched_skills": matched_all,
            "matched_required_skills": matched_required,
            "matched_preferred_skills": matched_preferred,
            "missing_required_skills": missing_required,
            "missing_preferred_skills": missing_preferred,
            "relevant_profile_evidence": evidence,
            "strengths": strengths,
            "improvement_suggestions": suggestions,
            "match_explanation": explanation,
            "model_used": Path(self.model_source).name if Path(self.model_source).exists() else self.model_source,
            "limitations": (
                "This score reflects local semantic and skill alignment against the supplied job description only. "
                "It does not predict hiring probability, verify seniority, or reflect live job-market data."
            ),
            "diagnostics": {
                "user_skills_detected": user_skills,
                "required_skills_detected": req_skills,
                "preferred_skills_detected": pref_skills,
                "uncertain_skills_detected": uncertain_skills,
                "excluded_dimensions": excluded_dimensions,
                "profile_truncated": profile_truncated,
                "job_description_truncated": jd_truncated,
            },
        }


_DEFAULT_MATCHER: Optional[JobMatcherEngine] = None


def match_job_to_profile(profile: Dict[str, Any], job: Dict[str, Any]) -> Dict[str, Any]:
    global _DEFAULT_MATCHER
    if _DEFAULT_MATCHER is None:
        _DEFAULT_MATCHER = JobMatcherEngine()
    return _DEFAULT_MATCHER.match(profile, job)
