"""
CareerPilot AI — Phase 3F-2: Career Roadmap ML Engine
=====================================================
Hybrid architecture combining:
  1. Pretrained sentence embeddings (all-MiniLM-L6-v2) for semantic target-role
     and informal skill matching (with ambiguity detection).
  2. Knowledge-based skill taxonomy & prerequisite DAG validated via Kahn's
     topological sort (cycle detection + reference validation).
  3. Progress-aware sequencing keeping known_skills, completed_skills,
     missing_skills, uncertain_skills, recommended_next_skills, and blocked_skills
     strictly separate.
  4. Verified official documentation references only.

Disclaimer: Provides learning-path guidance only — not employment predictions,
guaranteed career outcomes, or verified assessments of actual proficiency.
"""

from __future__ import annotations

import logging
import re
from collections import deque
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np

logger = logging.getLogger("careerpilot.career_roadmap")
logger.addHandler(logging.NullHandler())

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
LOCAL_MODEL_DIR = MODELS_DIR / "all-MiniLM-L6-v2"

MAX_TEXT_CHARS = 25_000
DEFAULT_ROLE_THRESHOLD = 0.36
DEFAULT_AMBIGUITY_MARGIN = 0.04
DEFAULT_SKILL_THRESHOLD = 0.60

# Curated skill taxonomy with stable IDs, tiers, prerequisites, and official docs
SKILL_TAXONOMY: Dict[str, Dict[str, Any]] = {
    "html5": {
        "id": "html5",
        "name": "HTML5",
        "category": "Core Web",
        "tier": "foundational",
        "aliases": ["html", "html5", "semantic html"],
        "prerequisites": [],
        "estimated_hours": 4,
        "learning_objective": "Structure accessible web pages using semantic HTML5 landmarks and forms.",
        "official_resource": {
            "title": "MDN Web Docs — HTML",
            "url": "https://developer.mozilla.org/en-US/docs/Web/HTML",
            "source_type": "official_documentation",
        },
    },
    "css3": {
        "id": "css3",
        "name": "CSS3",
        "category": "Core Web",
        "tier": "foundational",
        "aliases": ["css", "css3", "flexbox", "css grid", "responsive css"],
        "prerequisites": ["html5"],
        "estimated_hours": 6,
        "learning_objective": "Build responsive desktop and mobile layouts using Flexbox, Grid, and media queries.",
        "official_resource": {
            "title": "MDN Web Docs — CSS",
            "url": "https://developer.mozilla.org/en-US/docs/Web/CSS",
            "source_type": "official_documentation",
        },
    },
    "javascript": {
        "id": "javascript",
        "name": "JavaScript",
        "category": "Programming",
        "tier": "foundational",
        "aliases": ["javascript", "js", "es6", "ecmascript", "async/await"],
        "prerequisites": ["html5"],
        "estimated_hours": 10,
        "learning_objective": "Master ES6+ syntax, DOM manipulation, promises, async/await, and Fetch API.",
        "official_resource": {
            "title": "MDN Web Docs — JavaScript",
            "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
            "source_type": "official_documentation",
        },
    },
    "git": {
        "id": "git",
        "name": "Git",
        "category": "Workflow",
        "tier": "foundational",
        "aliases": ["git", "github", "gitlab", "git branching", "version control"],
        "prerequisites": [],
        "estimated_hours": 3,
        "learning_objective": "Manage branches, commits, pull requests, and merge conflicts cleanly.",
        "official_resource": {
            "title": "Git Official Documentation",
            "url": "https://git-scm.com/doc",
            "source_type": "official_documentation",
        },
    },
    "python": {
        "id": "python",
        "name": "Python",
        "category": "Programming",
        "tier": "foundational",
        "aliases": ["python", "python3", "python programming"],
        "prerequisites": [],
        "estimated_hours": 10,
        "learning_objective": "Write clean Python functions, data structures, virtual environments, and modules.",
        "official_resource": {
            "title": "Python Documentation",
            "url": "https://docs.python.org/3/",
            "source_type": "official_documentation",
        },
    },
    "sql": {
        "id": "sql",
        "name": "SQL",
        "category": "Databases",
        "tier": "foundational",
        "aliases": ["sql", "postgresql", "postgres", "mysql", "sqlite", "relational databases"],
        "prerequisites": [],
        "estimated_hours": 6,
        "learning_objective": "Query, filter, join, and aggregate relational tables safely.",
        "official_resource": {
            "title": "PostgreSQL Documentation",
            "url": "https://www.postgresql.org/docs/",
            "source_type": "official_documentation",
        },
    },
    "nosql": {
        "id": "nosql",
        "name": "NoSQL",
        "category": "Databases",
        "tier": "intermediate",
        "aliases": ["nosql", "no-sql", "mongodb", "document database"],
        "prerequisites": ["sql"],
        "estimated_hours": 5,
        "learning_objective": "Model and query document-oriented databases and understand schema tradeoffs.",
        "official_resource": {
            "title": "MongoDB Documentation",
            "url": "https://www.mongodb.com/docs/",
            "source_type": "official_documentation",
        },
    },
    "java": {
        "id": "java",
        "name": "Java",
        "category": "Programming",
        "tier": "foundational",
        "aliases": ["java", "jdk", "jvm"],
        "prerequisites": [],
        "estimated_hours": 12,
        "learning_objective": "Understand object-oriented Java fundamentals, collections, and exception handling.",
        "official_resource": {
            "title": "Oracle Java Documentation",
            "url": "https://docs.oracle.com/en/java/",
            "source_type": "official_documentation",
        },
    },
    "typescript": {
        "id": "typescript",
        "name": "TypeScript",
        "category": "Programming",
        "tier": "intermediate",
        "aliases": ["typescript", "ts"],
        "prerequisites": ["javascript"],
        "estimated_hours": 6,
        "learning_objective": "Add static type safety, interfaces, and generics to JavaScript applications.",
        "official_resource": {
            "title": "TypeScript Handbook",
            "url": "https://www.typescriptlang.org/docs/",
            "source_type": "official_documentation",
        },
    },
    "react": {
        "id": "react",
        "name": "React",
        "category": "Frameworks",
        "tier": "intermediate",
        "aliases": ["react", "reactjs", "react.js", "react hooks", "react components"],
        "prerequisites": ["html5", "css3", "javascript"],
        "estimated_hours": 10,
        "learning_objective": "Build reusable components, manage state with hooks, and structure SPA views.",
        "official_resource": {
            "title": "React Documentation",
            "url": "https://react.dev/learn",
            "source_type": "official_documentation",
        },
    },
    "react_native": {
        "id": "react_native",
        "name": "React Native",
        "category": "Frameworks",
        "tier": "advanced",
        "prerequisites": ["react"],
        "estimated_hours": 10,
        "learning_objective": "Build cross-platform mobile interfaces using React Native components.",
        "official_resource": {
            "title": "React Native Documentation",
            "url": "https://reactnative.dev/docs/getting-started",
            "source_type": "official_documentation",
        },
    },
    "rest_api": {
        "id": "rest_api",
        "name": "REST API",
        "category": "Integration",
        "tier": "intermediate",
        "aliases": ["rest", "rest api", "rest apis", "restful", "http apis"],
        "prerequisites": ["git"],
        "estimated_hours": 5,
        "learning_objective": "Design or consume HTTP endpoints with proper status codes, loading, and error states.",
        "official_resource": {
            "title": "MDN Web Docs — HTTP",
            "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP",
            "source_type": "official_documentation",
        },
    },
    "nodejs": {
        "id": "nodejs",
        "name": "Node.js",
        "category": "Frameworks",
        "tier": "intermediate",
        "aliases": ["node", "node.js", "nodejs", "express"],
        "prerequisites": ["javascript", "rest_api"],
        "estimated_hours": 8,
        "learning_objective": "Build server-side JavaScript APIs, middleware, and async request handlers.",
        "official_resource": {
            "title": "Node.js Documentation",
            "url": "https://nodejs.org/en/docs",
            "source_type": "official_documentation",
        },
    },
    "fastapi": {
        "id": "fastapi",
        "name": "FastAPI",
        "category": "Frameworks",
        "tier": "intermediate",
        "aliases": ["fastapi", "django", "flask", "python web frameworks"],
        "prerequisites": ["python", "rest_api"],
        "estimated_hours": 7,
        "learning_objective": "Create validated Python REST APIs with Pydantic schemas and clean error handling.",
        "official_resource": {
            "title": "FastAPI Documentation",
            "url": "https://fastapi.tiangolo.com/",
            "source_type": "official_documentation",
        },
    },
    "testing": {
        "id": "testing",
        "name": "Automated Testing",
        "category": "Quality",
        "tier": "advanced",
        "aliases": ["vitest", "jest", "pytest", "unit testing", "component testing", "testing"],
        "prerequisites": ["git"],
        "estimated_hours": 6,
        "learning_objective": "Write automated unit and integration tests to verify edge cases and prevent regressions.",
        "official_resource": {
            "title": "Pytest Documentation",
            "url": "https://docs.pytest.org/",
            "source_type": "official_documentation",
        },
    },
    "docker": {
        "id": "docker",
        "name": "Docker",
        "category": "Tools",
        "tier": "advanced",
        "aliases": ["docker", "containers", "containerization"],
        "prerequisites": ["git"],
        "estimated_hours": 6,
        "learning_objective": "Package applications and dependencies into reproducible containers.",
        "official_resource": {
            "title": "Docker Get Started",
            "url": "https://docs.docker.com/get-started/",
            "source_type": "official_documentation",
        },
    },
    "numpy_pandas": {
        "id": "numpy_pandas",
        "name": "NumPy & Pandas",
        "category": "Data",
        "tier": "intermediate",
        "aliases": ["numpy", "pandas", "dataframes", "data manipulation"],
        "prerequisites": ["python"],
        "estimated_hours": 8,
        "learning_objective": "Clean, transform, and aggregate tabular datasets using vectorized operations.",
        "official_resource": {
            "title": "Pandas User Guide",
            "url": "https://pandas.pydata.org/docs/user_guide/",
            "source_type": "official_documentation",
        },
    },
    "data_viz": {
        "id": "data_viz",
        "name": "Data Visualization",
        "category": "Data",
        "tier": "intermediate",
        "aliases": ["matplotlib", "seaborn", "data visualization", "charts"],
        "prerequisites": ["python", "numpy_pandas"],
        "estimated_hours": 5,
        "learning_objective": "Create clear, accurately labelled charts to communicate distributions and trends.",
        "official_resource": {
            "title": "Matplotlib Tutorials",
            "url": "https://matplotlib.org/stable/tutorials/index.html",
            "source_type": "official_documentation",
        },
    },
    "statistics_eda": {
        "id": "statistics_eda",
        "name": "Statistics & EDA",
        "category": "Data",
        "tier": "intermediate",
        "aliases": ["statistics", "eda", "exploratory data analysis", "probability"],
        "prerequisites": ["numpy_pandas"],
        "estimated_hours": 8,
        "learning_objective": "Apply descriptive statistics, hypothesis testing, and exploratory data analysis.",
        "official_resource": {
            "title": "SciPy Stats Reference",
            "url": "https://docs.scipy.org/doc/scipy/reference/stats.html",
            "source_type": "official_documentation",
        },
    },
    "machine_learning": {
        "id": "machine_learning",
        "name": "Machine Learning",
        "category": "ML/AI",
        "tier": "intermediate",
        "aliases": ["machine learning", "ml", "scikit-learn", "sklearn", "supervised learning"],
        "prerequisites": ["python", "numpy_pandas", "statistics_eda"],
        "estimated_hours": 12,
        "learning_objective": "Train, validate, and evaluate regression and classification models without leakage.",
        "official_resource": {
            "title": "scikit-learn User Guide",
            "url": "https://scikit-learn.org/stable/user_guide.html",
            "source_type": "official_documentation",
        },
    },
    "deep_learning": {
        "id": "deep_learning",
        "name": "Deep Learning & NLP",
        "category": "ML/AI",
        "tier": "advanced",
        "aliases": ["deep learning", "pytorch", "tensorflow", "nlp", "transformers", "embeddings"],
        "prerequisites": ["python", "machine_learning"],
        "estimated_hours": 14,
        "learning_objective": "Apply neural networks and pretrained transformer embeddings for NLP/vision tasks.",
        "official_resource": {
            "title": "PyTorch Tutorials",
            "url": "https://pytorch.org/tutorials/",
            "source_type": "official_documentation",
        },
    },
    "ml_deployment": {
        "id": "ml_deployment",
        "name": "ML Deployment",
        "category": "ML/AI",
        "tier": "advanced",
        "aliases": ["mlops", "model deployment", "ml serving", "model api"],
        "prerequisites": ["machine_learning", "fastapi", "docker"],
        "estimated_hours": 7,
        "learning_objective": "Serve saved ML models reliably behind validated API endpoints.",
        "official_resource": {
            "title": "FastAPI Deployment Guide",
            "url": "https://fastapi.tiangolo.com/deployment/",
            "source_type": "official_documentation",
        },
    },
}

# Disambiguation masks so compound tokens never false-match shorter tokens
DISAMBIGUATION_MASKS = [
    ("react_native", ["react native"]),
    ("javascript", ["javascript"]),
    ("nosql", ["nosql", "no-sql"]),
    ("deep_learning", ["deep learning"]),
    ("machine_learning", ["machine learning"]),
]

ROLE_REQUIREMENTS: Dict[str, Dict[str, Any]] = {
    "Frontend Developer": {
        "description": "Builds responsive, accessible browser user interfaces with HTML5, CSS3, JavaScript, TypeScript, React, REST APIs, Git, and automated UI testing.",
        "required_skill_ids": ["html5", "css3", "javascript", "git", "rest_api", "typescript", "react", "testing"],
    },
    "Backend Developer": {
        "description": "Designs server-side web APIs, relational databases, testing, and containerized deployments using Python, FastAPI, Node.js, SQL, Git, and Docker.",
        "required_skill_ids": ["python", "sql", "git", "rest_api", "fastapi", "nodejs", "testing", "docker"],
    },
    "Full Stack Developer": {
        "description": "Builds end-to-end full-stack web applications spanning client-side web UIs, server-side Node.js REST APIs, relational SQL databases, Git workflows, automated testing, and Dockerized deployments.",
        "required_skill_ids": ["html5", "css3", "javascript", "git", "sql", "rest_api", "typescript", "react", "nodejs", "testing", "docker"],
    },
    "Python Developer": {
        "description": "Develops clean Python applications, REST APIs, database integrations, automated pytest suites, and containerized services.",
        "required_skill_ids": ["python", "git", "sql", "rest_api", "fastapi", "testing", "docker"],
    },
    "Data Analyst": {
        "description": "Analyzes tabular datasets, writes SQL queries, performs exploratory data analysis and statistics, and creates charts with Python and Pandas.",
        "required_skill_ids": ["sql", "python", "git", "numpy_pandas", "statistics_eda", "data_viz"],
    },
    "Data Scientist": {
        "description": "Combines SQL, Python, statistics, exploratory data analysis, visualization, and scikit-learn machine learning models to analyze data.",
        "required_skill_ids": ["python", "sql", "git", "numpy_pandas", "statistics_eda", "data_viz", "machine_learning", "deep_learning"],
    },
    "Machine Learning Engineer": {
        "description": "Builds, evaluates, and deploys production machine learning and NLP systems using Python, scikit-learn, PyTorch, FastAPI, testing, and Docker.",
        "required_skill_ids": ["python", "git", "numpy_pandas", "statistics_eda", "machine_learning", "rest_api", "fastapi", "deep_learning", "testing", "docker", "ml_deployment"],
    },
}


def validate_prerequisite_graph(
    taxonomy: Dict[str, Dict[str, Any]],
    role_requirements: Dict[str, Dict[str, Any]],
) -> Tuple[bool, Optional[str]]:
    """Validates that all skill/prerequisite references exist and the graph is acyclic."""
    for skill_id, meta in taxonomy.items():
        for prereq in meta.get("prerequisites", []):
            if prereq not in taxonomy:
                return False, f"Skill '{skill_id}' references nonexistent prerequisite '{prereq}'."

    for role_name, info in role_requirements.items():
        for sid in info.get("required_skill_ids", []):
            if sid not in taxonomy:
                return False, f"Role '{role_name}' references nonexistent skill '{sid}'."

    # Kahn's cycle detection across the entire taxonomy
    in_deg = {sid: 0 for sid in taxonomy}
    deps: Dict[str, List[str]] = {sid: [] for sid in taxonomy}
    for sid, meta in taxonomy.items():
        for prereq in meta.get("prerequisites", []):
            in_deg[sid] += 1
            deps[prereq].append(sid)

    q = deque([sid for sid, d in in_deg.items() if d == 0])
    visited = 0
    while q:
        curr = q.popleft()
        visited += 1
        for nxt in deps[curr]:
            in_deg[nxt] -= 1
            if in_deg[nxt] == 0:
                q.append(nxt)

    if visited != len(taxonomy):
        return False, "Prerequisite graph contains a cycle."

    return True, None


class CareerRoadmapEngine:
    """Hybrid ML + Prerequisite-DAG Career Roadmap generator."""

    def __init__(
        self,
        model_path: Optional[str] = None,
        artifact_dir: Optional[str] = None,
        role_threshold: float = DEFAULT_ROLE_THRESHOLD,
        ambiguity_margin: float = DEFAULT_AMBIGUITY_MARGIN,
        skill_threshold: float = DEFAULT_SKILL_THRESHOLD,
    ) -> None:
        self.model_source = model_path or (
            str(LOCAL_MODEL_DIR) if LOCAL_MODEL_DIR.exists() else "sentence-transformers/all-MiniLM-L6-v2"
        )
        self.artifact_dir = Path(artifact_dir) if artifact_dir else ARTIFACTS_DIR
        self.role_threshold = role_threshold
        self.ambiguity_margin = ambiguity_margin
        self.skill_threshold = skill_threshold
        self._model = None
        self._role_vecs: Optional[np.ndarray] = None
        self._skill_vecs: Optional[np.ndarray] = None

    def _get_model(self):
        if self._model is None:
            import gc
            import torch
            from sentence_transformers import SentenceTransformer

            torch.set_num_threads(1)
            is_local = Path(self.model_source).exists()
            logger.info("Loading CareerRoadmap model from %s (local_only=%s)", self.model_source, is_local)
            self._model = SentenceTransformer(
                self.model_source,
                device="cpu",
                local_files_only=is_local,
                model_kwargs={"low_cpu_mem_usage": True},
            )
            gc.collect()
        return self._model

    def _encode(self, texts: List[str]) -> np.ndarray:
        return self._get_model().encode(texts, normalize_embeddings=True)

    def resolve_role(self, target_role: str) -> Dict[str, Any]:
        """Resolves raw target role to a canonical role with confidence & ambiguity checks."""
        cleaned = re.sub(r"\s+", " ", target_role).strip()
        lower = cleaned.lower()
        expanded = re.sub(r"[-_]+", " ", lower)
        expanded = re.sub(r"\s+", " ", expanded).strip()
        expanded = re.sub(r"\bfull\s*stack\b", "full stack", expanded)
        expanded = re.sub(r"\bml\b", "machine learning", expanded)
        expanded = re.sub(r"\beng\b", "engineer", expanded)
        expanded = re.sub(r"\bdev\b", "developer", expanded)

        # Exact or direct canonical containment check
        exact_matches = [
            name for name in ROLE_REQUIREMENTS
            if name.lower() == expanded or name.lower() in expanded
        ]
        if len(exact_matches) == 1:
            return {
                "status": "resolved",
                "raw_role": cleaned,
                "canonical_role": exact_matches[0],
                "confidence": 1.0,
                "matched_by": "exact",
                "candidates": [{"role": exact_matches[0], "confidence": 1.0}],
            }

        role_names = list(ROLE_REQUIREMENTS.keys())
        if self._role_vecs is None:
            role_texts = [
                f"{name}: {ROLE_REQUIREMENTS[name]['description']}" for name in role_names
            ]
            self._role_vecs = self._encode(role_texts)

        q_vec = self._encode([cleaned])[0]
        sims = np.dot(self._role_vecs, q_vec)
        ranked_idx = np.argsort(-sims)

        candidates = [
            {"role": role_names[int(i)], "confidence": round(float(sims[int(i)]), 4)}
            for i in ranked_idx[:3]
        ]
        top_role = candidates[0]["role"]
        top_conf = candidates[0]["confidence"]
        second_conf = candidates[1]["confidence"] if len(candidates) > 1 else 0.0

        if top_conf < self.role_threshold:
            return {
                "status": "unsupported",
                "raw_role": cleaned,
                "canonical_role": None,
                "confidence": top_conf,
                "matched_by": "semantic",
                "candidates": candidates,
            }

        if (top_conf - second_conf) < self.ambiguity_margin and top_conf < 0.72:
            return {
                "status": "ambiguous",
                "raw_role": cleaned,
                "canonical_role": None,
                "confidence": top_conf,
                "matched_by": "semantic",
                "candidates": candidates,
            }

        return {
            "status": "resolved",
            "raw_role": cleaned,
            "canonical_role": top_role,
            "confidence": top_conf,
            "matched_by": "semantic",
            "candidates": candidates,
        }

    def map_skills(
        self, raw_items: List[str], extra_text: str = ""
    ) -> Tuple[List[str], List[str]]:
        """Maps explicit skill strings and extra text to canonical IDs, returning (matched_ids, uncertain_items)."""
        matched: Set[str] = set()
        uncertain: List[str] = []

        def _alias_scan(text: str) -> Set[str]:
            found_ids: Set[str] = set()
            masked = text.lower()
            for canonical_id, phrases in DISAMBIGUATION_MASKS:
                for phrase in phrases:
                    pat = r"(?<![a-z0-9+#.])" + re.escape(phrase) + r"(?![a-z0-9+#.])"
                    if re.search(pat, masked):
                        found_ids.add(canonical_id)
                        masked = re.sub(pat, " ", masked)

            for sid, meta in SKILL_TAXONOMY.items():
                if sid in found_ids:
                    continue
                for alias in meta.get("aliases", []):
                    pat = r"(?<![a-z0-9+#.])" + re.escape(alias) + r"(?![a-z0-9+#.])"
                    if re.search(pat, masked):
                        found_ids.add(sid)
                        break
            return found_ids

        if extra_text.strip():
            matched.update(_alias_scan(extra_text))

        skill_ids = list(SKILL_TAXONOMY.keys())
        unmatched_for_semantic: List[str] = []

        for item in raw_items:
            clean_item = re.sub(r"\s+", " ", item).strip()
            if not clean_item:
                continue
            direct_hits = _alias_scan(clean_item)
            if direct_hits:
                matched.update(direct_hits)
            else:
                unmatched_for_semantic.append(clean_item)

        if unmatched_for_semantic:
            if self._skill_vecs is None:
                skill_texts = [
                    f"{SKILL_TAXONOMY[sid]['name']} ({', '.join(SKILL_TAXONOMY[sid].get('aliases', [])[:3])}): "
                    f"{SKILL_TAXONOMY[sid]['learning_objective']}"
                    for sid in skill_ids
                ]
                self._skill_vecs = self._encode(skill_texts)

            item_vecs = self._encode(unmatched_for_semantic)
            sim_mat = np.dot(item_vecs, self._skill_vecs.T)
            for idx, item_str in enumerate(unmatched_for_semantic):
                best_j = int(np.argmax(sim_mat[idx]))
                if float(sim_mat[idx, best_j]) >= self.skill_threshold:
                    matched.add(skill_ids[best_j])
                elif item_str not in uncertain:
                    uncertain.append(item_str)

        ordered_ids = [sid for sid in SKILL_TAXONOMY if sid in matched]
        return ordered_ids, uncertain

    @staticmethod
    def topological_sort_skills(skill_ids: List[str]) -> List[str]:
        """Orders target skills using Kahn's algorithm respecting prerequisites."""
        target_set = set(skill_ids)
        tier_rank = {"foundational": 0, "intermediate": 1, "advanced": 2}
        in_deg: Dict[str, int] = {sid: 0 for sid in skill_ids}
        dependents: Dict[str, List[str]] = {sid: [] for sid in skill_ids}

        for sid in skill_ids:
            for prereq in SKILL_TAXONOMY[sid]["prerequisites"]:
                if prereq in target_set:
                    in_deg[sid] += 1
                    dependents[prereq].append(sid)

        ready = sorted(
            [sid for sid, d in in_deg.items() if d == 0],
            key=lambda s: (tier_rank[SKILL_TAXONOMY[s]["tier"]], s),
        )
        queue = deque(ready)
        ordered: List[str] = []

        while queue:
            curr = queue.popleft()
            ordered.append(curr)
            newly_ready = []
            for dep in dependents[curr]:
                in_deg[dep] -= 1
                if in_deg[dep] == 0:
                    newly_ready.append(dep)
            for nxt in sorted(newly_ready, key=lambda s: (tier_rank[SKILL_TAXONOMY[s]["tier"]], s)):
                queue.append(nxt)

        return ordered

    def generate_roadmap(
        self,
        target_role: Any,
        experience_level: Optional[str] = None,
        education: Optional[str] = None,
        known_skills: Optional[List[str]] = None,
        completed_skills: Optional[List[str]] = None,
        project_descriptions: Optional[List[str]] = None,
        resume_text: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generates a validated, progress-aware career roadmap."""
        graph_ok, graph_err = validate_prerequisite_graph(SKILL_TAXONOMY, ROLE_REQUIREMENTS)
        if not graph_ok:
            return {"valid": False, "error_code": "INVALID_GRAPH", "error": graph_err}

        if not isinstance(target_role, str) or not target_role.strip():
            return {
                "valid": False,
                "error_code": "INVALID_INPUT",
                "error": "Target role must be a non-empty string.",
            }

        if len(target_role) > 300:
            return {
                "valid": False,
                "error_code": "INVALID_INPUT",
                "error": "Target role exceeds maximum length (300 characters).",
            }

        if known_skills is not None and not isinstance(known_skills, list):
            return {"valid": False, "error_code": "INVALID_INPUT", "error": "known_skills must be a list of strings."}
        if completed_skills is not None and not isinstance(completed_skills, list):
            return {"valid": False, "error_code": "INVALID_INPUT", "error": "completed_skills must be a list of strings."}

        try:
            resolution = self.resolve_role(target_role)
        except Exception:
            return {
                "valid": False,
                "error_code": "MODEL_UNAVAILABLE",
                "error": "Career Roadmap ML model is unavailable.",
            }

        if resolution["status"] == "unsupported":
            return {
                "valid": False,
                "error_code": "UNSUPPORTED_ROLE",
                "error": (
                    f"Target role '{resolution['raw_role']}' could not be confidently matched to a supported track "
                    f"({', '.join(ROLE_REQUIREMENTS.keys())})."
                ),
                "role_resolution": resolution,
            }

        if resolution["status"] == "ambiguous":
            top_names = [c["role"] for c in resolution["candidates"][:2]]
            return {
                "valid": False,
                "error_code": "AMBIGUOUS_ROLE",
                "error": (
                    f"Target role '{resolution['raw_role']}' is ambiguous between "
                    f"{' and '.join(top_names)}. Please specify a more specific role."
                ),
                "role_resolution": resolution,
            }

        canonical_role = resolution["canonical_role"]
        role_skill_ids = self.topological_sort_skills(
            ROLE_REQUIREMENTS[canonical_role]["required_skill_ids"]
        )

        raw_known = [str(s) for s in (known_skills or []) if isinstance(s, str) and s.strip()]
        raw_completed = [str(s) for s in (completed_skills or []) if isinstance(s, str) and s.strip()]
        extra_text = "\n".join(
            [str(p) for p in (project_descriptions or []) if isinstance(p, str) and p.strip()]
            + ([resume_text.strip()] if isinstance(resume_text, str) and resume_text.strip() else [])
        )[:MAX_TEXT_CHARS]

        known_ids, uncertain_known = self.map_skills(raw_known, extra_text)
        completed_ids, uncertain_completed = self.map_skills(raw_completed, "")

        # Preserve explicit separation between known and completed skills
        known_set = set(known_ids)
        completed_set = set(completed_ids)
        satisfied_set = known_set | completed_set

        role_known_names = [SKILL_TAXONOMY[sid]["name"] for sid in role_skill_ids if sid in known_set]
        role_completed_names = [SKILL_TAXONOMY[sid]["name"] for sid in role_skill_ids if sid in completed_set]
        missing_ids = [sid for sid in role_skill_ids if sid not in satisfied_set]
        missing_names = [SKILL_TAXONOMY[sid]["name"] for sid in missing_ids]

        uncertain_skills = list(dict.fromkeys(uncertain_known + uncertain_completed))

        roadmap_stages: Dict[str, List[Dict[str, Any]]] = {
            "foundational": [],
            "intermediate": [],
            "advanced": [],
        }
        recommended_next_skills: List[Dict[str, Any]] = []
        blocked_skills: List[Dict[str, Any]] = []
        prerequisite_explanations: List[Dict[str, Any]] = []
        learning_objectives: Dict[str, str] = {}
        resource_recommendations: List[Dict[str, Any]] = []
        total_hours = 0

        for sid in missing_ids:
            meta = SKILL_TAXONOMY[sid]
            relevant_prereq_ids = [p for p in meta["prerequisites"] if p in role_skill_ids]
            unmet_prereq_ids = [p for p in relevant_prereq_ids if p not in satisfied_set]
            relevant_prereq_names = [SKILL_TAXONOMY[p]["name"] for p in relevant_prereq_ids]
            unmet_prereq_names = [SKILL_TAXONOMY[p]["name"] for p in unmet_prereq_ids]
            actionable = len(unmet_prereq_ids) == 0

            explanation = (
                f"Actionable now: all prerequisites ({', '.join(relevant_prereq_names) or 'none'}) are satisfied."
                if actionable
                else f"Blocked until prerequisite(s) completed: {', '.join(unmet_prereq_names)}."
            )

            item = {
                "skill_id": sid,
                "skill": meta["name"],
                "category": meta["category"],
                "tier": meta["tier"],
                "prerequisites": relevant_prereq_names,
                "unmet_prerequisites": unmet_prereq_names,
                "actionable": actionable,
                "estimated_hours": meta["estimated_hours"],
                "explanation": explanation,
            }

            roadmap_stages[meta["tier"]].append(item)
            learning_objectives[meta["name"]] = meta["learning_objective"]
            total_hours += meta["estimated_hours"]

            prerequisite_explanations.append({
                "skill": meta["name"],
                "prerequisites": relevant_prereq_names,
                "unmet_prerequisites": unmet_prereq_names,
                "explanation": explanation,
            })

            if actionable:
                recommended_next_skills.append(item)
            else:
                blocked_skills.append(item)

            resource_recommendations.append({
                "skill_id": sid,
                "skill": meta["name"],
                **meta["official_resource"],
            })

        total_role_skills = len(role_skill_ids)
        satisfied_count = len(role_skill_ids) - len(missing_ids)
        coverage_pct = round((satisfied_count / total_role_skills) * 100, 1) if total_role_skills else 0.0

        unprovided_fields: List[str] = []
        if not education:
            unprovided_fields.append("education")
        if not experience_level:
            unprovided_fields.append("experience_level")
        if not extra_text.strip():
            unprovided_fields.append("resume_or_projects")

        if not missing_ids:
            personalization_explanation = (
                f"All {total_role_skills} curated skills for {canonical_role} are already accounted for "
                f"in your known or completed skills."
            )
        else:
            personalization_explanation = (
                f"Resolved '{resolution['raw_role']}' to '{canonical_role}' "
                f"({round(resolution['confidence'] * 100)}% confidence, matched by {resolution['matched_by']}). "
                f"{satisfied_count}/{total_role_skills} role skills are satisfied; "
                f"{len(recommended_next_skills)} skill(s) are immediately actionable and "
                f"{len(blocked_skills)} skill(s) await prerequisites."
            )

        return {
            "valid": True,
            "target_role": canonical_role,
            "role_resolution": resolution,
            "current_skill_assessment": {
                "total_role_skills": total_role_skills,
                "known_count": len(role_known_names),
                "completed_count": len(role_completed_names),
                "satisfied_count": satisfied_count,
                "missing_count": len(missing_names),
                "coverage_percent": coverage_pct,
                "unprovided_profile_fields": unprovided_fields,
            },
            "known_skills": role_known_names,
            "completed_skills": role_completed_names,
            "missing_skills": missing_names,
            "uncertain_skills": uncertain_skills,
            "roadmap_stages": roadmap_stages,
            "recommended_next_skills": recommended_next_skills,
            "blocked_skills": blocked_skills,
            "prerequisite_explanations": prerequisite_explanations,
            "learning_objectives": learning_objectives,
            "estimated_effort": {
                "approximate_hours_remaining": total_hours,
                "is_approximate": True,
                "note": "Approximate baseline study-hour estimate only; actual time varies by prior background and is not a guarantee.",
            },
            "resource_recommendations": resource_recommendations,
            "personalization_explanation": personalization_explanation,
            "model_used": Path(self.model_source).name if Path(self.model_source).exists() else self.model_source,
            "limitations": (
                "Provides curated learning-path guidance using semantic matching and a prerequisite DAG. "
                "Does not verify actual proficiency, predict employability, or guarantee career outcomes."
            ),
        }
