"""
CareerPilot AI — Phase 3D-2: Category-Aware Interview Coach AI Engine
=====================================================================
Standalone, local-inference NLP engine for evaluating interview answers across:
  - Behavioral & Graduate/Culture Fit ('behavioral', 'general'): STAR structure + themes
  - Technical ('frontend', 'dsa'): Conceptual understanding + tradeoffs + examples

Scores represent transparent rubric and semantic alignment signals — NOT hiring probability.
"""

from __future__ import annotations

import json
import logging
import re
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("careerpilot.interview_coach")
logger.addHandler(logging.NullHandler())

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
QUESTION_BANK_PATH = BASE_DIR / "artifacts" / "question_bank.json"
RESUME_ANALYZER_MINILM_DIR = BASE_DIR.parent / "ResumeAnalyzer" / "models" / "all-MiniLM-L6-v2"

MAX_ANSWER_CHARS = 6_000
BEHAVIORAL_CATEGORIES = {"behavioral", "general"}
VALID_CATEGORIES = {
    "behavioral",
    "frontend",
    "backend",
    "python",
    "cpp",
    "java",
    "csharp",
    "dotnet",
    "mern",
    "dsa",
    "dbms",
    "os",
    "networks",
    "aiml",
    "datascience",
    "logic",
    "general",
}


def _load_question_bank() -> Dict[str, Dict[str, Any]]:
    if QUESTION_BANK_PATH.exists():
        try:
            data = json.loads(QUESTION_BANK_PATH.read_text(encoding="utf-8"))
            if isinstance(data, dict) and len(data) > 0:
                return data
        except Exception:
            logger.warning("Failed to load question_bank.json; falling back to empty dict.")
    return {}


QUESTION_BANK: Dict[str, Dict[str, Any]] = _load_question_bank()

STAR_PROTOTYPES = {
    "situation": "In my university project or internship, we were working on a team deadline when an issue occurred.",
    "task": "My responsibility and goal was to investigate the problem and deliver a working fix.",
    "action": "I debugged the root cause, reproduced the error, wrote tests, and implemented the solution.",
    "result": "As a result, the bug was resolved, performance improved, and I learned how to prevent it.",
}

STAR_CUE_PATTERNS = {
    "situation": (
        r"\b(during|in my|when i|when we|while working|last semester|internship|project|team|"
        r"at my|in a recent|we had|there was|facing|encountered|situation|context|college|"
        r"course|hackathon|production|capstone|worked on)\b"
    ),
    "task": (
        r"\b(my goal|responsible for|needed to|task was|had to|objective|assigned|"
        r"my role|expected to|goal was|we needed|challenge was|problem was)\b"
    ),
    "action": (
        r"\b(i\s+(?:debugged|built|implemented|tested|refactored|talked|proposed|analyzed|"
        r"fixed|created|investigated|started|profiled|wrote|diagnosed|redesigned|"
        r"collaborated|spoke|broke|resolved|deployed|added|checked|isolated|reviewed|"
        r"set up|paired|switched|migrated|optimized|measured|led|organized|used)|"
        r"first,\s*i|to solve this|we decided to)\b"
    ),
    "result": (
        r"\b(as a result|outcome|learned|improved|reduced|resolved|fixed|succeeded|"
        r"delivered|passed|dropped|increased|faster|on time|successfully|\d+%|\d+\+)\b"
    ),
}

FILLER_PHRASES = [
    "kind of", "sort of", "i guess", "maybe", "basically", "stuff", "things", "you know", "whatever"
]

PRACTICAL_EXAMPLE_CUES = r"\b(for example|for instance|in my project|such as|like when|e\.g\.|trade-?off|specifically)\b"


def _resolve_default_model_source() -> str:
    bge_dir = MODELS_DIR / "bge-small-en-v1.5"
    minilm_dir = MODELS_DIR / "all-MiniLM-L6-v2"
    if bge_dir.exists():
        return str(bge_dir)
    if minilm_dir.exists():
        return str(minilm_dir)
    if RESUME_ANALYZER_MINILM_DIR.exists():
        return str(RESUME_ANALYZER_MINILM_DIR)
    return "BAAI/bge-small-en-v1.5"


class InterviewCoachEngine:
    """Category-aware NLP interview answer evaluator using local sentence embeddings."""

    def __init__(self, model_name_or_path: Optional[str] = None) -> None:
        self.model_source = model_name_or_path or _resolve_default_model_source()
        self._model = None

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            is_local = Path(self.model_source).exists()
            logger.info("Loading InterviewCoach embedding model from %s", self.model_source)
            self._model = SentenceTransformer(self.model_source, local_files_only=is_local)
        return self._model

    @staticmethod
    def _clean_text(text: str, max_chars: int) -> Tuple[str, bool]:
        normalized = re.sub(r"\s+", " ", text).strip()
        truncated = len(normalized) > max_chars
        if truncated:
            normalized = normalized[:max_chars]
        return normalized, truncated

    @staticmethod
    def _split_sentences(text: str) -> List[str]:
        parts = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", text) if s.strip()]
        return parts if parts else ([text] if text.strip() else [])

    def _encode(self, texts: List[str]) -> np.ndarray:
        model = self._get_model()
        return model.encode(texts, normalize_embeddings=True)

    @staticmethod
    def _scale_sim(sim: float, low: float = 0.25, high: float = 0.72) -> float:
        return float(np.clip((sim - low) / (high - low), 0.0, 1.0))

    @staticmethod
    def _is_code_submission(text: str) -> bool:
        code_markers = (
            r"\bdef\s+\w+\s*\(",
            r"\bfunction\s+\w*\s*\(",
            r"\b(const|let|var)\s+\w+\s*=",
            r"\bfor\s+[\w,\s()]+\s+in\b",
            r"\bfor\s*\(",
            r"\bwhile\s*[\s(]",
            r"\breturn\b",
            r"=>",
            r"\benumerate\s*\(",
            r"\bnew\s+(Map|Set|HashMap|HashSet)\b",
        )
        hits = sum(1 for pat in code_markers if re.search(pat, text))
        return hits >= 2 or ("def " in text and "return" in text)

    @staticmethod
    def _extract_code_signals(text: str) -> Dict[str, bool]:
        lower = text.lower()
        uses_hash = bool(
            re.search(r"\{\s*\}|\bdict\s*\(|\bset\s*\(|\bnew\s+(map|set|hashmap|hashset)\b|\bseen\b|\blookup\b", lower)
            or re.search(r"\b\w+\s*\[\s*\w+\s*\]\s*=", lower)
        )
        uses_complement = bool(
            re.search(r"target\s*-\s*[a-z0-9_\[\]]+|\bcomplement\b|\bdiff\b", lower)
        )
        uses_sort = bool(re.search(r"\.sort\s*\(|\bsorted\s*\(", lower))
        states_complexity = bool(re.search(r"\bo\s*\(\s*(?:1|n|n\s*log\s*n|n\^2|n²)\s*\)", lower))
        states_bruteforce = bool(re.search(r"\bbrute\s*force\b|\bnested\s+loop", lower))
        return {
            "uses_hash": uses_hash,
            "uses_complement": uses_complement,
            "uses_sort": uses_sort,
            "states_complexity": states_complexity,
            "states_bruteforce": states_bruteforce,
        }

    def _evaluate_concepts(
        self, answer_text: str, sentences: List[str], expected_concepts: List[str]
    ) -> Tuple[List[str], List[str], float]:
        if not expected_concepts:
            return [], [], 0.5

        candidates = sentences if sentences else [answer_text]
        cand_vecs = self._encode(candidates + [answer_text])
        concept_vecs = self._encode(expected_concepts)

        is_code = self._is_code_submission(answer_text)
        code_sig = self._extract_code_signals(answer_text) if is_code else {}
        ans_lower = answer_text.lower()

        covered: List[str] = []
        missing: List[str] = []
        scores: List[float] = []

        for idx, concept in enumerate(expected_concepts):
            sims = np.dot(cand_vecs, concept_vecs[idx])
            best_sim = float(np.max(sims))
            c_lower = concept.lower()

            concept_tokens = [w for w in re.findall(r"[a-z0-9]+", c_lower) if len(w) >= 3]
            token_hits = sum(
                1 for t in concept_tokens
                if t in ans_lower or (len(t) >= 5 and t[:5] in ans_lower)
            )
            lexical_bonus = min(0.20, token_hits * 0.055)

            # Code-aware algorithmic concept recognition
            code_bonus = 0.0
            if is_code:
                if any(k in c_lower for k in ("hash", "set", "map", "dict", "o(n)")) and code_sig.get("uses_hash"):
                    code_bonus = 0.28
                if any(k in c_lower for k in ("complement", "target", "difference")) and code_sig.get("uses_complement"):
                    code_bonus = max(code_bonus, 0.28)
                if "sort" in c_lower and code_sig.get("uses_sort"):
                    code_bonus = max(code_bonus, 0.25)

            combined = best_sim + lexical_bonus + code_bonus
            scores.append(self._scale_sim(combined, low=0.28, high=0.66))

            if combined >= 0.42:
                covered.append(concept)
            else:
                missing.append(concept)

        coverage_ratio = float(np.mean(scores)) if scores else 0.0
        return covered, missing, coverage_ratio

    def _evaluate_star(self, answer_text: str, sentences: List[str]) -> Dict[str, Any]:
        candidates = sentences if sentences else [answer_text]
        cand_vecs = self._encode(candidates)
        proto_keys = list(STAR_PROTOTYPES.keys())
        proto_vecs = self._encode([STAR_PROTOTYPES[k] for k in proto_keys])

        star_result: Dict[str, Any] = {}
        for idx, comp in enumerate(proto_keys):
            sem_best = float(np.max(np.dot(cand_vecs, proto_vecs[idx])))
            cue_hit = bool(re.search(STAR_CUE_PATTERNS[comp], answer_text, re.IGNORECASE))
            confidence = round(min(1.0, sem_best + (0.15 if cue_hit else 0.0)), 3)
            if comp == "result":
                present = (cue_hit and sem_best >= 0.30) or sem_best >= 0.56
            else:
                present = confidence >= 0.46 or (cue_hit and sem_best >= 0.28)
            star_result[comp] = {
                "present": present,
                "confidence": confidence,
            }
        return star_result

    @staticmethod
    def _evaluate_clarity_and_communication(
        answer_text: str, sentences: List[str], category: str = "behavioral"
    ) -> Tuple[float, float, Dict[str, Any]]:
        words = answer_text.split()
        word_count = len(words)
        lower = answer_text.lower()

        filler_hits = sum(lower.count(f) for f in FILLER_PHRASES)
        tokens = [t for t in re.findall(r"[a-z]{3,}", lower)]
        counts = Counter(tokens)
        max_rep = max(counts.values()) if counts else 0
        rep_ratio = (max_rep / max(1, len(tokens))) if len(tokens) >= 10 else 0.0

        # Pacing score: technical answers can be crisp (25-190 words); behavioral ideal is 50-200 words
        is_technical = category not in BEHAVIORAL_CATEGORIES
        if (25 <= word_count <= 190 and is_technical) or (50 <= word_count <= 200):
            pacing = 1.0
        elif (18 <= word_count < 25 and is_technical) or (30 <= word_count < 50) or (200 < word_count <= 280):
            pacing = 0.78
        elif word_count >= 12:
            pacing = 0.50
        else:
            pacing = 0.15

        structure_bonus = 0.15 if len(sentences) >= 3 else (0.05 if len(sentences) == 2 else 0.0)
        filler_penalty = min(0.35, filler_hits * 0.1)
        rep_penalty = min(0.35, max(0.0, rep_ratio - 0.18) * 1.5)

        clarity_norm = float(np.clip(pacing * 0.75 + structure_bonus + 0.10 - rep_penalty, 0.0, 1.0))
        comm_norm = float(np.clip(pacing * 0.70 + 0.30 - filler_penalty - rep_penalty * 0.7, 0.0, 1.0))

        diagnostics = {
            "word_count": word_count,
            "sentence_count": len(sentences),
            "filler_count": filler_hits,
            "repetition_ratio": round(rep_ratio, 3),
        }
        return clarity_norm, comm_norm, diagnostics

    @staticmethod
    def _build_illustrative_example(
        category: str,
        missing_concepts: List[str],
        star_assessment: Optional[Dict[str, Any]],
        question_text: str = "",
    ) -> str:
        prefix = "Illustrative example (template for improvement — not an actual candidate response): "
        q_lower = (question_text or "").lower()

        if category in {"behavioral", "general"}:
            missing_star = (
                [k.title() for k, v in star_assessment.items() if not v["present"]]
                if star_assessment
                else []
            )
            focus = f"explicitly add {', '.join(missing_star)}" if missing_star else "tighten your STAR transitions"
            concept_note = (
                f" and mention {missing_concepts[0]}" if missing_concepts else ""
            )
            return (
                prefix
                + f"To strengthen this answer, {focus}{concept_note}. For example: "
                + "'During a production service outage (Situation), I needed to restore availability and isolate the root cause (Task). "
                + "I inspected health endpoints and logs, added graceful 503 error handling, and restarted the failing worker (Action), "
                + "which restored uptime within minutes and prevented silent failures (Result).'"
            )

        focus = (
            f"cover {', '.join(missing_concepts[:2])}"
            if missing_concepts
            else "include a concrete tradeoff or complexity note"
        )

        if category == "python" or ("list" in q_lower and "tuple" in q_lower):
            return (
                prefix
                + f"To strengthen this Python answer, {focus}. For example: "
                + "'A Python list uses square brackets [] and is mutable (supporting append, remove, and in-place updates), "
                + "while a tuple uses parentheses () and is immutable, making tuples safer for fixed records and usable as dictionary keys.'"
            )
        if "two sum" in q_lower or ("two numbers" in q_lower and "target" in q_lower):
            return (
                prefix
                + f"To strengthen this algorithm answer, {focus}. For example: "
                + "'A brute-force nested loop takes O(n²) time, whereas storing visited values in a hash map/set lets you check "
                + "(target - current) in O(1) average time, achieving O(n) time and O(n) space.'"
            )
        if "merge" in q_lower and "interval" in q_lower:
            return (
                prefix
                + f"To strengthen this algorithm answer, {focus}. For example: "
                + "'Sort the intervals by start time in O(n log n) time, then iterate once and merge any interval whose start "
                + "is <= the previous end using max(prev_end, curr_end), giving O(n log n) total time.'"
            )
        if category == "frontend" or any(k in q_lower for k in ("react", "props", "state", "dom", "css")):
            return (
                prefix
                + f"To strengthen this frontend answer, {focus}. For example: "
                + "'In React, props flow read-only from parent to child, while state is owned internally. "
                + "When two sibling components need the same filter state, lift it to their common parent and pass down the value and updater callback.'"
            )

        return (
            prefix
            + f"To strengthen this {category} answer, {focus}. Structure your explanation with a clear definition, "
            + "a concrete example or implementation detail, and key performance or design tradeoffs."
        )

    def evaluate(
        self,
        answer_text: Any,
        category: str,
        question_text: Optional[str] = None,
        question_id: Optional[str] = None,
        expected_concepts: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        if not isinstance(category, str) or category.strip().lower() not in VALID_CATEGORIES:
            return {
                "valid": False,
                "error": f"Invalid category. Must be one of: {', '.join(sorted(VALID_CATEGORIES))}.",
                "overall_score": 0,
            }
        cat = category.strip().lower()

        if not isinstance(answer_text, str) or not answer_text.strip():
            return {
                "valid": False,
                "category": cat,
                "error": "Answer text must be a non-empty string.",
                "overall_score": 0,
            }

        clean_answer, truncated = self._clean_text(answer_text, MAX_ANSWER_CHARS)
        bank_entry = QUESTION_BANK.get(question_id) if question_id else None
        resolved_question = (
            question_text.strip()
            if isinstance(question_text, str) and question_text.strip()
            else (bank_entry["question"] if bank_entry else f"General {cat} interview question")
        )
        resolved_concepts = (
            expected_concepts
            if expected_concepts
            else (bank_entry["expected_concepts"] if bank_entry else [])
        )

        is_code = self._is_code_submission(clean_answer)
        code_sig = self._extract_code_signals(clean_answer) if is_code else {}
        sentences = self._split_sentences(clean_answer)
        if is_code and len(sentences) < 2:
            sentences = [ln.strip() for ln in clean_answer.splitlines() if ln.strip()]

        qa_vecs = self._encode([resolved_question, clean_answer])
        raw_relevance = float(np.clip(np.dot(qa_vecs[0], qa_vecs[1]), 0.0, 1.0))
        if is_code and (code_sig.get("uses_hash") or code_sig.get("uses_complement") or code_sig.get("uses_sort")):
            raw_relevance = max(raw_relevance, 0.52)
        relevance_norm = self._scale_sim(raw_relevance, low=0.22, high=0.68)

        covered, missing, concept_norm = self._evaluate_concepts(
            clean_answer, sentences, resolved_concepts
        )
        clarity_norm, comm_norm, diag = self._evaluate_clarity_and_communication(
            clean_answer, sentences, category=cat
        )

        has_example_cue = bool(re.search(PRACTICAL_EXAMPLE_CUES, clean_answer, re.IGNORECASE))
        has_metric = bool(re.search(r"\d+%|\d+\+|\b\d{2,}\b", clean_answer))
        practical_norm = float(
            np.clip(
                0.30
                + (0.40 if has_example_cue else 0.0)
                + (0.30 if has_metric or diag["word_count"] >= 60 else 0.0),
                0.0,
                1.0,
            )
        )

        # Off-topic / ultra-short guard so irrelevant or 1-word answers cannot score high
        if diag["word_count"] < 5 or raw_relevance < 0.22:
            practical_norm *= 0.25
            concept_norm *= 0.40

        star_assessment: Optional[Dict[str, Any]] = None
        if cat in {"behavioral", "general"}:
            star_assessment = self._evaluate_star(clean_answer, sentences)
            present_star_count = sum(1 for v in star_assessment.values() if v["present"])
            star_weights = {"situation": 6.0, "task": 6.0, "action": 10.0, "result": 8.0}
            star_pts = sum(
                star_weights[k] if star_assessment[k]["present"] else star_weights[k] * 0.2
                for k in star_weights
            )
            if diag["word_count"] < 10:
                star_pts *= 0.3

            # Concrete domain-specific STAR stories (3+ STAR elements, >= 40 words) should not be
            # under-scored when using domain terms rather than generic rubric phrasing.
            beh_rel_norm = (
                self._scale_sim(raw_relevance, low=0.18, high=0.56)
                if present_star_count >= 3 and diag["word_count"] >= 40
                else relevance_norm
            )
            beh_concept_norm = (
                max(concept_norm, 0.58)
                if present_star_count >= 3 and diag["word_count"] >= 40 and raw_relevance >= 0.25
                else concept_norm
            )

            rel_pts = beh_rel_norm * 20.0
            concept_pts = beh_concept_norm * 20.0
            clarity_pts = clarity_norm * 8.0
            comm_pts = comm_norm * 7.0
            practical_pts = practical_norm * 15.0

            overall_score = int(
                round(rel_pts + star_pts + concept_pts + clarity_pts + comm_pts + practical_pts)
            )
            dimension_scores = {
                "relevance": round(rel_pts, 1),
                "relevance_max": 20,
                "star_completeness": round(star_pts, 1),
                "star_completeness_max": 30,
                "concept_coverage": round(concept_pts, 1),
                "concept_coverage_max": 20,
                "clarity": round(clarity_pts, 1),
                "clarity_max": 8,
                "communication": round(comm_pts, 1),
                "communication_max": 7,
                "practical_application": round(practical_pts, 1),
                "practical_application_max": 15,
            }
        else:
            # Technical ('frontend', 'dsa')
            rel_pts = relevance_norm * 20.0
            concept_pts = concept_norm * 30.0
            completeness_norm = (
                len(covered) / max(1, len(resolved_concepts))
                if resolved_concepts
                else concept_norm
            )
            comp_pts = completeness_norm * 20.0
            clarity_pts = clarity_norm * 8.0
            comm_pts = comm_norm * 7.0
            practical_pts = practical_norm * 15.0

            overall_score = int(
                round(rel_pts + concept_pts + comp_pts + clarity_pts + comm_pts + practical_pts)
            )
            dimension_scores = {
                "relevance": round(rel_pts, 1),
                "relevance_max": 20,
                "conceptual_understanding": round(concept_pts, 1),
                "conceptual_understanding_max": 30,
                "completeness": round(comp_pts, 1),
                "completeness_max": 20,
                "clarity": round(clarity_pts, 1),
                "clarity_max": 8,
                "communication": round(comm_pts, 1),
                "communication_max": 7,
                "practical_application": round(practical_pts, 1),
                "practical_application_max": 15,
            }

        overall_score = max(0, min(100, overall_score))

        # Grounded strengths & improvement suggestions
        strengths: List[str] = []
        suggestions: List[str] = []

        if raw_relevance >= 0.45:
            strengths.append("Directly addresses the interview question on-topic.")
        else:
            suggestions.append("Tie your response more directly back to what the question is asking.")

        if covered:
            strengths.append(f"Covered key ideas: {', '.join(covered[:3])}.")
        if missing:
            suggestions.append(f"Consider also addressing: {', '.join(missing[:3])}.")

        if star_assessment:
            present_star = [k.title() for k, v in star_assessment.items() if v["present"]]
            missing_star = [k.title() for k, v in star_assessment.items() if not v["present"]]
            if len(present_star) >= 3:
                strengths.append(f"Includes STAR structure elements ({', '.join(present_star)}).")
            if missing_star:
                suggestions.append(f"Strengthen STAR structure by adding: {', '.join(missing_star)}.")

        if 55 <= diag["word_count"] <= 190:
            strengths.append(f"Well-paced length ({diag['word_count']} words).")
        elif diag["word_count"] < 40:
            suggestions.append("Expand your answer with specific details or a brief project example (aim for 60–150 words).")
        elif diag["word_count"] > 220:
            suggestions.append("Trim repetitive details to keep your delivery concise (under ~180 words).")

        if diag["filler_count"] > 0:
            suggestions.append("Reduce hedging/filler phrases (e.g., 'kind of', 'basically', 'stuff').")

        if is_code:
            strengths.append("Submitted an executable code solution.")
            if not code_sig.get("states_complexity"):
                suggestions.append(
                    "Your code implements an algorithmic approach; briefly state the time and space complexity (e.g., O(n) time, O(n) space) and contrast with brute force if applicable."
                )

        if not has_example_cue and not has_metric and not is_code:
            suggestions.append("Include a concrete example or measurable outcome to ground your explanation.")

        return {
            "valid": True,
            "model_used": self.model_source,
            "category": cat,
            "overall_score": overall_score,
            "question_relevance_similarity": round(raw_relevance, 4),
            "dimension_scores": dimension_scores,
            "star_assessment": star_assessment,
            "covered_concepts": covered,
            "missing_concepts": missing,
            "strengths": strengths,
            "improvement_suggestions": suggestions,
            "illustrative_example": self._build_illustrative_example(
                cat, missing, star_assessment, resolved_question
            ),
            "diagnostics": {
                **diag,
                "truncated": truncated,
            },
        }


_DEFAULT_COACH: Optional[InterviewCoachEngine] = None


def evaluate_interview_answer(
    answer_text: Any,
    category: str,
    question_text: Optional[str] = None,
    question_id: Optional[str] = None,
    expected_concepts: Optional[List[str]] = None,
) -> Dict[str, Any]:
    global _DEFAULT_COACH
    if _DEFAULT_COACH is None:
        _DEFAULT_COACH = InterviewCoachEngine()
    return _DEFAULT_COACH.evaluate(
        answer_text=answer_text,
        category=category,
        question_text=question_text,
        question_id=question_id,
        expected_concepts=expected_concepts,
    )
