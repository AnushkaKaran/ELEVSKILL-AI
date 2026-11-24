"""
CareerPilot AI — Phase 3A: Hybrid NLP Resume Analyzer Engine
===========================================================
Local, privacy-preserving NLP engine combining:
  1. Rule-based & structural section parsing (PII-safe boolean contact checks)
  2. Categorized technical skill extraction (languages, frameworks, databases, tools)
  3. Pretrained Transformer sentence embeddings (all-MiniLM-L6-v2) for semantic relevance
  4. Writing quality diagnostics (vague phrasing, measurable impact, repetition)
  5. Transparent, documented scoring rubric (not a hiring-outcome prediction)
"""

from __future__ import annotations

import logging
import math
import re
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("careerpilot.resume_analyzer")
logger.addHandler(logging.NullHandler())

DEFAULT_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
BASE_DIR = Path(__file__).resolve().parent
LOCAL_MODEL_DIR = BASE_DIR / "models" / "all-MiniLM-L6-v2"

MAX_RESUME_CHARS = 25_000
MAX_JD_CHARS = 12_000

# Categorized technical skill taxonomy with common aliases
SKILL_TAXONOMY: Dict[str, Dict[str, List[str]]] = {
    "languages": {
        "Python": ["python", "py"],
        "JavaScript": ["javascript", "js", "es6", "ecmascript"],
        "TypeScript": ["typescript", "ts"],
        "Java": ["java"],
        "C++": ["c++", "cpp"],
        "C#": ["c#", "csharp"],
        "C": ["c language", "c programming"],
        "Go": ["golang"],
        "Rust": ["rust"],
        "SQL": ["sql", "tsql", "plsql"],
        "HTML5": ["html", "html5"],
        "CSS3": ["css", "css3", "scss", "sass"],
        "R": ["r programming"],
        "PHP": ["php"],
        "Kotlin": ["kotlin"],
        "Swift": ["swift"],
    },
    "frameworks": {
        "React": ["react", "reactjs", "react.js"],
        "Next.js": ["next.js", "nextjs"],
        "Vue.js": ["vue", "vuejs", "vue.js"],
        "Angular": ["angular"],
        "Node.js": ["node.js", "nodejs", "node"],
        "Express": ["express", "expressjs", "express.js"],
        "FastAPI": ["fastapi"],
        "Django": ["django"],
        "Flask": ["flask"],
        "Spring Boot": ["spring boot", "springboot"],
        "Tailwind CSS": ["tailwind", "tailwindcss"],
        "Bootstrap": ["bootstrap"],
        "PyTorch": ["pytorch", "torch"],
        "TensorFlow": ["tensorflow", "tf"],
        "scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
        "Machine Learning": ["machine learning", "ml", "supervised learning", "unsupervised learning"],
        "Pandas": ["pandas"],
        "NumPy": ["numpy"],
    },
    "databases": {
        "PostgreSQL": ["postgresql", "postgres"],
        "MySQL": ["mysql"],
        "SQLite": ["sqlite"],
        "MongoDB": ["mongodb", "mongo"],
        "Redis": ["redis"],
        "Firebase": ["firebase", "firestore"],
        "Supabase": ["supabase"],
        "DynamoDB": ["dynamodb"],
        "Oracle": ["oracle db"],
        "DBMS": ["dbms", "rdbms", "database management system", "database management systems"],
    },
    "tools": {
        "Git": ["git"],
        "Docker": ["docker"],
        "Kubernetes": ["kubernetes", "k8s"],
        "AWS": ["aws", "amazon web services"],
        "GCP": ["gcp", "google cloud"],
        "Azure": ["azure"],
        "Vite": ["vite"],
        "Webpack": ["webpack"],
        "REST API": ["rest", "rest api", "restful", "rest apis"],
        "GraphQL": ["graphql"],
        "Linux": ["linux", "ubuntu", "bash"],
        "CI/CD": ["ci/cd", "github actions", "jenkins"],
        "Vitest": ["vitest"],
        "Jest": ["jest"],
        "Pytest": ["pytest"],
        "Figma": ["figma"],
        "Jira": ["jira"],
        "Jupyter": ["jupyter", "jupyter notebook"],
    },
}

SECTION_PATTERNS: Dict[str, List[str]] = {
    "summary": [
        r"summary", r"professional summary", r"career objective", r"objective", r"profile", r"about me"
    ],
    "education": [
        r"education", r"academic background", r"academics", r"university", r"degree", r"coursework",
        r"educational background", r"academic qualifications", r"qualifications", r"schooling",
        r"education\s*&\s*training", r"academic history", r"degrees"
    ],
    "experience": [
        r"experience", r"work experience", r"employment", r"internship", r"internships", r"career history",
        r"professional experience", r"work history", r"relevant experience", r"industry experience",
        r"internships\s*&\s*experience", r"experience\s*&\s*internships"
    ],
    "projects": [
        r"projects", r"personal projects", r"academic projects", r"key projects", r"portfolio",
        r"academic\s*&\s*personal projects", r"selected projects", r"technical projects",
        r"notable projects", r"software projects", r"projects\s*&\s*coursework"
    ],
    "skills": [
        r"skills", r"technical skills", r"core competencies", r"technologies", r"tech stack",
        r"skills\s*&\s*competencies", r"technical proficiencies", r"programming skills",
        r"tools\s*&\s*technologies", r"areas of expertise", r"key skills"
    ],
    "certifications": [
        r"certifications", r"certificates", r"licenses", r"credentials", r"awards\s*&\s*certifications",
        r"licenses\s*&\s*certifications"
    ],
}

STRONG_ACTION_VERBS = {
    "architected", "automated", "built", "collaborated", "created", "debugged",
    "delivered", "deployed", "designed", "developed", "engineered", "enhanced",
    "evaluated", "implemented", "improved", "integrated", "launched", "led",
    "migrated", "optimized", "orchestrated", "reduced", "refactored", "researched",
    "resolved", "scaled", "streamlined", "tested", "trained",
}

WEAK_PHRASES = [
    "worked on", "helped with", "responsible for", "assisted with", "involved in",
    "tasked with", "did ", "made ", "various ", "etc", "things", "stuff",
]

STOPWORDS = {
    "the", "and", "for", "with", "that", "this", "from", "your", "you", "are",
    "was", "were", "will", "have", "has", "had", "our", "not", "but", "all",
    "any", "can", "use", "using", "used", "into", "about", "more", "than",
    "also", "such", "well", "able", "new", "who", "what", "when", "where",
    "how", "their", "they", "them", "been", "being", "through", "over", "under",
}


class ResumeAnalyzerEngine:
    """Hybrid NLP resume analyzer using SentenceTransformer embeddings + structural/skill heuristics."""

    def __init__(self, model_name_or_path: Optional[str] = None) -> None:
        if model_name_or_path:
            self.model_source = model_name_or_path
        elif LOCAL_MODEL_DIR.exists():
            self.model_source = str(LOCAL_MODEL_DIR)
        else:
            self.model_source = DEFAULT_MODEL_NAME

        self._model = None

    def _get_model(self):
        if self._model is None:
            import gc
            import torch
            from sentence_transformers import SentenceTransformer

            torch.set_num_threads(1)
            logger.info("Loading SentenceTransformer model from %s", self.model_source)
            is_local_dir = Path(self.model_source).exists()
            self._model = SentenceTransformer(
                self.model_source,
                device="cpu",
                local_files_only=is_local_dir,
                model_kwargs={"low_cpu_mem_usage": True},
            )
            gc.collect()
        return self._model

    @staticmethod
    def _clean_text(text: str, max_chars: int) -> Tuple[str, bool]:
        normalized = text.replace("\r\n", "\n").replace("\r", "\n")
        # Normalize common PDF ligatures, zero-width characters, and special whitespace/bullets
        replacements = {
            "\ufb00": "ff",
            "\ufb01": "fi",
            "\ufb02": "fl",
            "\ufb03": "ffi",
            "\ufb04": "ffl",
            "\u00a0": " ",
            "\u200b": "",
            "\u200c": "",
            "\u200d": "",
            "\ufeff": "",
            "\u2018": "'",
            "\u2019": "'",
            "\u201c": '"',
            "\u201d": '"',
            "\u2013": "-",
            "\u2014": "-",
        }
        for src, dst in replacements.items():
            normalized = normalized.replace(src, dst)
        normalized = re.sub(r"^[\s]*[▪▸➤❖◦●■□◆◇]\s*", "- ", normalized, flags=re.MULTILINE)
        normalized = re.sub(r"[ \t]+", " ", normalized)
        normalized = re.sub(r"\n{3,}", "\n\n", normalized).strip()
        truncated = len(normalized) > max_chars
        if truncated:
            normalized = normalized[:max_chars]
        return normalized, truncated

    @staticmethod
    def _detect_contact_info(text: str) -> Dict[str, bool]:
        """Detects contact channels as booleans without storing or logging raw PII."""
        has_email = bool(re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text))
        has_phone = bool(re.search(r"(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}", text))
        has_links = bool(re.search(r"(?:linkedin\.com|github\.com|gitlab\.com|https?://)", text, re.IGNORECASE))
        return {
            "has_email": has_email,
            "has_phone": has_phone,
            "has_links": has_links,
            "has_any_contact": has_email or has_phone or has_links,
        }

    @staticmethod
    def _normalize_heading_candidate(line: str) -> str:
        """Strips Markdown headings, bold/italic wrappers, bullets, and trailing punctuation."""
        cleaned = line.strip()
        cleaned = re.sub(r"^#{1,6}\s*", "", cleaned)
        cleaned = re.sub(r"^[-*•\d.)]+\s*", "", cleaned)
        cleaned = cleaned.replace("**", "").replace("__", "").strip("*_` ")
        cleaned = re.sub(r"[:\-–—|]+$", "", cleaned).strip()
        return cleaned.lower()

    @classmethod
    def _extract_sections(cls, text: str) -> Dict[str, Dict[str, Any]]:
        """Parses resume into canonical sections based on line-level heading detection."""
        lines = [line.strip() for line in text.split("\n")]
        sections_content: Dict[str, List[str]] = {k: [] for k in SECTION_PATTERNS}
        current_section: Optional[str] = None
        detected_headers: set[str] = set()

        for line in lines:
            if not line:
                continue

            cleaned_heading = cls._normalize_heading_candidate(line)
            matched_section = None

            # Headings are typically short (<= 6 words)
            if cleaned_heading and len(cleaned_heading.split()) <= 6:
                for sec_name, patterns in SECTION_PATTERNS.items():
                    if any(re.fullmatch(pat, cleaned_heading) for pat in patterns):
                        matched_section = sec_name
                        break

            if matched_section:
                current_section = matched_section
                detected_headers.add(matched_section)
            elif current_section:
                sections_content[current_section].append(line)

        edu_fallback_pattern = re.compile(
            r"\b(b\.?s\.?|b\.?e\.?|b\.?tech|b\.?sc|b\.?ca|b\.?ba|m\.?s\.?|m\.?tech|m\.?sc|m\.?ca|m\.?ba|"
            r"ph\.?d|bachelor|master|diploma|university|college|institute of technology|cgpa|gpa|"
            r"high school|graduation|expected\s+202\d|class\s+of\s+202\d)\b",
            re.I,
        )

        assessment: Dict[str, Dict[str, Any]] = {}
        for sec_name in SECTION_PATTERNS:
            sec_text = "\n".join(sections_content[sec_name]).strip()
            word_count = len(sec_text.split()) if sec_text else 0

            # Fallback keyword check if user didn't use explicit section headers
            has_header = sec_name in detected_headers
            if not has_header and sec_name == "education":
                edu_lines = [ln for ln in lines if ln and edu_fallback_pattern.search(ln)]
                if edu_lines:
                    sec_text = "\n".join(edu_lines)
                    word_count = max(word_count, len(sec_text.split()))

            if has_header and word_count >= 6:
                status = "present"
            elif not has_header and sec_name == "education" and word_count >= 6:
                status = "present"
            elif has_header or word_count > 0:
                status = "incomplete"
            else:
                status = "missing"

            assessment[sec_name] = {
                "status": status,
                "has_explicit_header": has_header,
                "word_count": word_count,
                "text": sec_text,
            }

        return assessment

    @staticmethod
    def _has_standalone_c(lower_text: str) -> bool:
        """Detects standalone C language mentions while avoiding C++, C#, Objective-C, and 'Option C'."""
        if re.search(r"(?<![a-z0-9])c\s*/\s*c\+\+(?![a-z0-9])", lower_text):
            return True

        cleaned = re.sub(r"(?<![a-z0-9])objective[\s-]+c(?![a-z0-9])", " ", lower_text)
        cleaned = re.sub(r"(?<![a-z0-9])c(?:\+\+|#)(?![a-z0-9])", " ", cleaned)
        cleaned = re.sub(
            r"\b(?:option|grade|track|section|part|class|type|level|tier|vitamin|group|category|appendix|exhibit|plan|version)\s+c\b",
            " ",
            cleaned,
        )
        return bool(re.search(r"(?<![a-z0-9+\-#./])c(?![a-z0-9+\-#.])", cleaned))

    @classmethod
    def extract_skills(cls, text: str) -> Dict[str, List[str]]:
        """Extracts normalized technical skills grouped by category."""
        # Strip URLs during skill scanning so profile/repo links (e.g., github.com/...) do not inflate skills
        scan_text = re.sub(r"(?:https?://|www\.)\S+|(?:github|gitlab|linkedin)\.com/\S+", " ", text.lower())
        found: Dict[str, List[str]] = {cat: [] for cat in SKILL_TAXONOMY}

        for category, skill_map in SKILL_TAXONOMY.items():
            for canonical_name, aliases in skill_map.items():
                for alias in aliases:
                    # Word-boundary aware match for alphanumeric/symbol tokens
                    pattern = r"(?<![a-z0-9])" + re.escape(alias) + r"(?![a-z0-9])"
                    if re.search(pattern, scan_text):
                        if canonical_name not in found[category]:
                            found[category].append(canonical_name)
                        break

        if "C" not in found["languages"] and cls._has_standalone_c(scan_text):
            found["languages"].append("C")

        return found

    def _encode_long_text(self, text: str, chunk_words: int = 180) -> np.ndarray:
        """Encodes arbitrary-length text safely by chunking and mean-pooling L2-normalized embeddings."""
        model = self._get_model()
        words = text.split()
        if not words:
            return np.zeros(384, dtype=np.float32)

        chunks = [
            " ".join(words[i : i + chunk_words])
            for i in range(0, len(words), chunk_words)
        ]
        embeddings = model.encode(chunks, normalize_embeddings=True)
        mean_vec = np.mean(embeddings, axis=0)
        norm = np.linalg.norm(mean_vec)
        return (mean_vec / norm) if norm > 0 else mean_vec

    def _compute_semantic_relevance(
        self,
        resume_text: str,
        job_description: str,
        sections: Dict[str, Dict[str, Any]],
        resume_skills_flat: List[str],
        jd_skills_flat: List[str],
    ) -> Dict[str, Any]:
        """Computes transformer embedding cosine similarity + TF-IDF lexical baseline."""
        resume_vec = self._encode_long_text(resume_text)
        jd_vec = self._encode_long_text(job_description)
        overall_semantic = float(np.clip(np.dot(resume_vec, jd_vec), 0.0, 1.0))

        # Lexical baseline using TF-IDF (1-2 grams, preserving technical tokens like node.js/c++/ci/cd)
        # blended with matched JD skill coverage when JD specifies technical skills
        try:
            vec = TfidfVectorizer(
                stop_words="english",
                ngram_range=(1, 2),
                token_pattern=r"(?u)\b[a-zA-Z0-9][a-zA-Z0-9+#./-]*\b",
                max_features=600,
            )
            tfidf_matrix = vec.fit_transform([resume_text, job_description])
            tfidf_sim = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
        except ValueError:
            tfidf_sim = 0.0

        if jd_skills_flat:
            matched_jd_ratio = len(set(resume_skills_flat) & set(jd_skills_flat)) / len(set(jd_skills_flat))
            lexical_sim = float(np.clip(0.5 * tfidf_sim + 0.5 * matched_jd_ratio, 0.0, 1.0))
        else:
            lexical_sim = tfidf_sim

        # Section-level semantic relevance
        section_relevances = []
        matched_skill_set = set(resume_skills_flat) & set(jd_skills_flat)

        for sec_name, sec_info in sections.items():
            sec_text = sec_info.get("text", "").strip()
            if not sec_text or len(sec_text.split()) < 4:
                continue

            sec_vec = self._encode_long_text(sec_text)
            sec_sim = float(np.clip(np.dot(sec_vec, jd_vec), 0.0, 1.0))

            sec_skills = [
                s for s in matched_skill_set
                if s.lower() in sec_text.lower()
            ]
            if sec_skills:
                reason = f"Aligned with target role skills: {', '.join(sec_skills[:5])}."
            elif sec_sim >= 0.45:
                reason = "High semantic alignment with responsibilities or domain terms in the job description."
            elif sec_sim >= 0.28:
                reason = "Moderate contextual overlap with the target job description."
            else:
                reason = "Limited direct overlap with the target job description."

            section_relevances.append({
                "section": sec_name,
                "similarity": round(sec_sim, 4),
                "reason": reason,
            })

        section_relevances.sort(key=lambda x: x["similarity"], reverse=True)

        return {
            "overall_similarity": round(overall_semantic, 4),
            "lexical_tfidf_similarity": round(lexical_sim, 4),
            "section_relevances": section_relevances,
        }

    @staticmethod
    def _analyze_quality(resume_text: str) -> Dict[str, Any]:
        """Evaluates bullet strength, measurable achievements, and word repetition."""
        raw_lines = [line.strip() for line in resume_text.split("\n") if line.strip()]
        bullets = [
            re.sub(r"^[-*•\d.)]+\s*", "", line).strip()
            for line in raw_lines
            if line.startswith(("-", "*", "•")) or len(line.split()) >= 7
        ]

        weak_bullets: List[str] = []
        non_action_bullets: List[str] = []
        unquantified_bullets: List[str] = []
        strong_verb_count = 0
        quantified_count = 0
        opening_verbs: Counter = Counter()

        for b in bullets:
            lower_b = b.lower()
            first_word = re.sub(r"[^a-z]", "", lower_b.split()[0]) if lower_b.split() else ""
            if first_word:
                opening_verbs[first_word] += 1
            if first_word in STRONG_ACTION_VERBS:
                strong_verb_count += 1
            elif len(b.split()) >= 5 and len(non_action_bullets) < 5:
                non_action_bullets.append(b[:120])

            has_metric = bool(re.search(r"\d+%|\$\d+|\d+\+|\d+x\b|\b\d{2,}\b", b, re.I))
            if has_metric:
                quantified_count += 1
            elif len(b.split()) >= 6 and len(unquantified_bullets) < 5:
                unquantified_bullets.append(b[:120])

            is_weak = any(phrase in lower_b for phrase in WEAK_PHRASES) or len(b.split()) < 5
            if is_weak and len(weak_bullets) < 5:
                weak_bullets.append(b[:120])

        tokens = [
            t for t in re.findall(r"[a-z]{3,}", resume_text.lower())
            if t not in STOPWORDS
        ]
        token_counts = Counter(tokens)
        repeated_words = [
            {"word": word, "count": count}
            for word, count in token_counts.most_common(12)
            if count >= 4
        ]
        repeated_openers = [
            {"word": verb, "count": count}
            for verb, count in opening_verbs.most_common(5)
            if count >= 3
        ]

        word_count = len(resume_text.split())
        return {
            "word_count": word_count,
            "bullet_count": len(bullets),
            "strong_action_verb_bullets": strong_verb_count,
            "quantified_bullets": quantified_count,
            "weak_bullets": weak_bullets,
            "non_action_bullets": non_action_bullets,
            "unquantified_bullets": unquantified_bullets,
            "repeated_words": repeated_words[:6],
            "repeated_opening_verbs": repeated_openers,
        }

    @staticmethod
    def _detect_candidate_level(clean_resume: str, sections_raw: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Distinguishes freshers/students, internship-only candidates, and experienced candidates."""
        exp_info = sections_raw.get("experience", {})
        exp_text = (exp_info.get("text") or "").strip()
        exp_lower = exp_text.lower()
        resume_lower = clean_resume.lower()

        has_exp_section = exp_info.get("status") in {"present", "incomplete"} and bool(exp_text)
        years_match = re.search(r"\b([1-9]\d?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)\b", resume_lower)
        explicit_fresher = bool(
            re.search(r"\b(fresher|recent graduate|fresh graduate|undergraduate|final[- ]year|seeking internship|entry[- ]level)\b", resume_lower)
        )
        has_internship_terms = bool(re.search(r"\b(intern|internship|trainee|apprentice)\b", exp_lower or resume_lower))
        has_fulltime_role_terms = bool(
            re.search(
                r"\b(software engineer|full[- ]stack|backend developer|frontend developer|data scientist|"
                r"ml engineer|product manager|senior|lead|staff|consultant|analyst)\b",
                exp_lower,
            )
        )

        if (has_exp_section and has_fulltime_role_terms and not re.fullmatch(r".*\bintern\b.*", exp_lower, re.S)) or (
            years_match and int(years_match.group(1)) >= 1
        ):
            return {
                "level": "experienced",
                "label": "Experienced Candidate",
                "has_work_experience": True,
                "has_internship": has_internship_terms,
            }

        if has_exp_section and has_internship_terms:
            return {
                "level": "internship",
                "label": "Student / Internship Experience",
                "has_work_experience": True,
                "has_internship": True,
            }

        if has_exp_section and exp_info.get("word_count", 0) >= 12 and not explicit_fresher:
            return {
                "level": "experienced",
                "label": "Experienced Candidate",
                "has_work_experience": True,
                "has_internship": has_internship_terms,
            }

        return {
            "level": "fresher",
            "label": "Fresher / Student",
            "has_work_experience": False,
            "has_internship": has_internship_terms,
        }

    def analyze(self, resume_text: Any, job_description: Optional[Any] = None) -> Dict[str, Any]:
        """Runs the complete hybrid NLP resume analysis pipeline."""
        if not isinstance(resume_text, str) or not resume_text.strip():
            return {
                "valid": False,
                "error": "Resume text must be a non-empty string.",
                "overall_score": 0,
            }

        clean_resume, resume_truncated = self._clean_text(resume_text, MAX_RESUME_CHARS)
        has_jd = isinstance(job_description, str) and bool(job_description.strip())
        clean_jd, jd_truncated = (
            self._clean_text(job_description, MAX_JD_CHARS) if has_jd else ("", False)
        )

        contact_info = self._detect_contact_info(clean_resume)
        sections_raw = self._extract_sections(clean_resume)
        candidate_profile = self._detect_candidate_level(clean_resume, sections_raw)
        resume_skills_by_cat = self.extract_skills(clean_resume)
        resume_skills_flat = [s for lst in resume_skills_by_cat.values() for s in lst]

        # If skills section had no explicit header but technical skills were extracted, mark present/incomplete
        if sections_raw["skills"]["status"] == "missing" and len(resume_skills_flat) >= 3:
            sections_raw["skills"]["status"] = "present"
            sections_raw["skills"]["word_count"] = len(resume_skills_flat)

        jd_skills_by_cat = self.extract_skills(clean_jd) if has_jd else {k: [] for k in SKILL_TAXONOMY}
        jd_skills_flat = [s for lst in jd_skills_by_cat.values() for s in lst]

        matched_skills = [s for s in jd_skills_flat if s in resume_skills_flat]
        missing_job_skills = [s for s in jd_skills_flat if s not in resume_skills_flat]

        semantic_relevance = (
            self._compute_semantic_relevance(
                clean_resume, clean_jd, sections_raw, resume_skills_flat, jd_skills_flat
            )
            if has_jd
            else None
        )

        quality = self._analyze_quality(clean_resume)

        # Transparent Scoring Rubric
        structure_pts = 0.0
        if contact_info["has_any_contact"]:
            structure_pts += 5.0
        if sections_raw["education"]["status"] == "present":
            structure_pts += 5.0
        elif sections_raw["education"]["status"] == "incomplete":
            structure_pts += 2.5

        exp_ok = sections_raw["experience"]["status"] == "present"
        proj_ok = sections_raw["projects"]["status"] == "present"
        if exp_ok and proj_ok:
            structure_pts += 10.0
        elif exp_ok or proj_ok:
            structure_pts += 6.5
        elif (
            sections_raw["experience"]["status"] == "incomplete"
            or sections_raw["projects"]["status"] == "incomplete"
        ):
            structure_pts += 3.0

        if sections_raw["skills"]["status"] == "present":
            structure_pts += 5.0
        elif sections_raw["skills"]["status"] == "incomplete":
            structure_pts += 2.5

        # Skills points (out of 25 with JD, or scaled without JD)
        breadth_pts = min(10.0, len(resume_skills_flat) * 1.25)
        if has_jd and jd_skills_flat:
            coverage_pts = (len(matched_skills) / len(jd_skills_flat)) * 15.0
        elif has_jd:
            coverage_pts = 7.5  # JD had no recognized technical skills in taxonomy
        else:
            coverage_pts = 0.0

        # Quality points (out of 20)
        wc = quality["word_count"]
        length_pts = 6.0 if 120 <= wc <= 900 else (3.5 if wc >= 60 else 1.5)
        verb_ratio = (
            quality["strong_action_verb_bullets"] / max(1, quality["bullet_count"])
        )
        verb_pts = min(6.0, verb_ratio * 8.0)
        metric_pts = min(5.0, quality["quantified_bullets"] * 1.75)
        rep_penalty = min(3.0, len(quality["repeated_opening_verbs"]) * 1.5)
        rep_pts = max(0.0, 3.0 - rep_penalty)
        quality_pts = length_pts + verb_pts + metric_pts + rep_pts

        if has_jd and semantic_relevance is not None:
            # Cosine similarity for resumes typically ranges 0.15 - 0.80; scale smoothly to 30 pts
            sim = semantic_relevance["overall_similarity"]
            semantic_pts = min(30.0, max(0.0, (sim - 0.10) / 0.65 * 30.0))
            total_score = round(structure_pts + breadth_pts + coverage_pts + semantic_pts + quality_pts)
            score_breakdown = {
                "structure_score": round(structure_pts, 1),
                "structure_max": 25,
                "skills_score": round(breadth_pts + coverage_pts, 1),
                "skills_max": 25,
                "semantic_relevance_score": round(semantic_pts, 1),
                "semantic_relevance_max": 30,
                "quality_score": round(quality_pts, 1),
                "quality_max": 20,
            }
        else:
            # Without JD: scale structure (25 -> 35), breadth (10 -> 30), quality (20 -> 35)
            s_scaled = (structure_pts / 25.0) * 35.0
            b_scaled = (breadth_pts / 10.0) * 30.0
            q_scaled = (quality_pts / 20.0) * 35.0
            total_score = round(s_scaled + b_scaled + q_scaled)
            score_breakdown = {
                "structure_score": round(s_scaled, 1),
                "structure_max": 35,
                "skills_score": round(b_scaled, 1),
                "skills_max": 30,
                "semantic_relevance_score": None,
                "semantic_relevance_max": 0,
                "quality_score": round(q_scaled, 1),
                "quality_max": 35,
            }

        total_score = int(max(0, min(100, total_score)))

        # Strengths & Improvements
        strengths: List[str] = []
        improvements: List[str] = []
        recommendations: List[str] = []

        if contact_info["has_any_contact"]:
            strengths.append("Contact information is present.")
        else:
            improvements.append("Missing detectable contact information (email, phone, or profile link).")
            recommendations.append("Add a professional email, phone number, and GitHub/LinkedIn/portfolio link at the top of your resume.")

        present_sections = [k for k, v in sections_raw.items() if v["status"] == "present"]
        missing_sections = [k for k, v in sections_raw.items() if v["status"] == "missing"]
        if present_sections:
            strengths.append(f"Detected core sections: {', '.join(present_sections)}.")

        if candidate_profile["level"] == "fresher":
            strengths.append("Profile detected as Fresher / Student (evaluated with project & education focus).")
        elif candidate_profile["level"] == "internship":
            strengths.append("Profile includes internship experience alongside academic/project work.")
        else:
            strengths.append("Profile includes professional work experience.")

        for sec in ["education", "experience", "projects", "skills"]:
            if sec in missing_sections:
                if sec == "experience" and candidate_profile["level"] == "fresher" and sections_raw["projects"]["status"] == "present":
                    recommendations.append(
                        "As a fresher, consider adding any internships, part-time technical roles, or open-source contributions under an Experience section."
                    )
                    continue
                improvements.append(f"Missing '{sec}' section.")
                if sec == "education":
                    recommendations.append("Add an Education section listing your degree, institution, graduation year, and relevant coursework.")
                elif sec == "projects":
                    recommendations.append("Add a Projects section highlighting 2–3 technical projects with tools used and measurable outcomes.")
                elif sec == "skills":
                    recommendations.append("Add a dedicated Technical Skills section grouped by languages, frameworks, databases, and tools.")
                else:
                    recommendations.append(f"Add a clearly labeled '{sec.title()}' section with concise bullet points.")

        if contact_info["has_any_contact"] and not contact_info["has_links"]:
            recommendations.append("Include a GitHub, portfolio, or LinkedIn link so reviewers can verify your projects.")

        if len(resume_skills_flat) >= 5:
            strengths.append(f"Identified {len(resume_skills_flat)} technical skills across categories.")
        else:
            improvements.append("Limited technical skills detected.")
            recommendations.append("List your programming languages, frameworks, databases, and tools explicitly.")

        if quality["quantified_bullets"] >= 2:
            strengths.append(f"Includes {quality['quantified_bullets']} bullet(s) with measurable outcomes.")
        else:
            improvements.append("Few or no measurable achievements detected.")
            if quality.get("unquantified_bullets"):
                sample_unq = quality["unquantified_bullets"][0][:65]
                recommendations.append(
                    f"Add measurable outcomes (e.g., latency %, users served, or test coverage) to bullets like \"{sample_unq}...\"."
                )
            else:
                recommendations.append("Quantify impact where possible (e.g., latency reduced by 30%, 200+ active users).")

        if quality["weak_bullets"]:
            sample_weak = quality["weak_bullets"][0][:60]
            improvements.append(
                f"Detected {len(quality['weak_bullets'])} vague or short bullet(s) (e.g., \"{sample_weak}...\")."
            )
            recommendations.append(
                f"Rewrite passive bullets (like \"{sample_weak}...\") using strong action verbs such as Built, Implemented, or Optimized."
            )
        elif quality.get("non_action_bullets"):
            sample_non_action = quality["non_action_bullets"][0][:60]
            recommendations.append(
                f"Start bullets like \"{sample_non_action}...\" with a strong action verb (Built, Designed, Implemented, Optimized) to improve writing impact."
            )

        if quality["repeated_opening_verbs"]:
            verbs_str = ", ".join(item["word"] for item in quality["repeated_opening_verbs"])
            improvements.append(f"Repeated bullet-opening verbs detected: {verbs_str}.")
            recommendations.append(f"Vary repeated opening verbs ({verbs_str}) across adjacent bullet points.")

        if has_jd and missing_job_skills:
            improvements.append(f"Missing job-description skills: {', '.join(missing_job_skills[:8])}.")
            recommendations.append(
                f"If you have experience with {', '.join(missing_job_skills[:5])}, highlight them in your Skills or Projects section."
            )

        if has_jd and semantic_relevance is not None:
            sim_pct = round(semantic_relevance["overall_similarity"] * 100)
            if sim_pct >= 55:
                strengths.append(f"Strong semantic alignment ({sim_pct}% similarity) with the target job description.")
            else:
                improvements.append(f"Moderate/low semantic alignment ({sim_pct}% similarity) with the target job description.")
                recommendations.append("Mirror key responsibilities and domain terminology from the target job description in your project or experience bullets.")

        # Deduplicate recommendations and improvements while preserving order
        recommendations = list(dict.fromkeys(recommendations))
        improvements = list(dict.fromkeys(improvements))

        section_assessment_clean = {
            sec: {
                "status": info["status"],
                "has_explicit_header": info["has_explicit_header"],
                "word_count": info["word_count"],
            }
            for sec, info in sections_raw.items()
        }

        return {
            "valid": True,
            "model_used": self.model_source,
            "overall_score": total_score,
            "candidate_profile": candidate_profile,
            "score_breakdown": score_breakdown,
            "contact_info": contact_info,
            "section_assessment": section_assessment_clean,
            "missing_sections": missing_sections,
            "skills_analysis": {
                "by_category": resume_skills_by_cat,
                "detected_skills": resume_skills_flat,
                "job_required_skills": jd_skills_flat,
                "matched_skills": matched_skills,
                "missing_job_skills": missing_job_skills,
            },
            "semantic_relevance": semantic_relevance,
            "quality_analysis": quality,
            "strengths": strengths,
            "areas_for_improvement": improvements,
            "recommendations": recommendations,
            "warnings": {
                "resume_truncated": resume_truncated,
                "job_description_truncated": jd_truncated,
            },
        }


_DEFAULT_ENGINE: Optional[ResumeAnalyzerEngine] = None


def analyze_resume(resume_text: Any, job_description: Optional[Any] = None) -> Dict[str, Any]:
    """Module-level convenience function using a cached ResumeAnalyzerEngine instance."""
    global _DEFAULT_ENGINE
    if _DEFAULT_ENGINE is None:
        _DEFAULT_ENGINE = ResumeAnalyzerEngine()
    return _DEFAULT_ENGINE.analyze(resume_text, job_description)
