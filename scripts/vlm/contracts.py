"""QuestionDescriptionV0 contract + leakage_guard (no external deps)."""
from __future__ import annotations
import hashlib
import json
import re
from dataclasses import dataclass, field, asdict
from typing import Literal

AnswerForm = Literal["exact", "approx", "proof", "graph", "table", "other"]

# Leakage detection patterns (answer/solution indicators)
# Patterns that BLOCK the result (strong leakage signals)
LEAKAGE_PATTERNS_BLOCK = [
    (r"\b(the\s+)?answer\s+is\b", "answer_disclosure"),
    (r"\btherefore\s+[a-z]\s*=", "solution_step"),
    (r"\bhence\s+[a-z]\s*=", "solution_step"),
    (r"\b(so|thus)\s+[a-z]\s*=\s*\d", "solution_step"),
    (r"\bmark\s*scheme\b", "mark_scheme_ref"),
]

# Patterns that only FLAG (common in question text, not strong leakage)
LEAKAGE_PATTERNS_FLAG_ONLY = [
    (r"\b\d+\s*marks?\b", "mark_allocation"),
    (r"=\s*\d+\.?\d*\s*(m|s|kg|N|J|W|Pa|Hz|V|A|Ω|C|F|H|T|mol|K)\b", "numeric_answer"),
]

# Legacy alias for backwards compatibility
LEAKAGE_PATTERNS = LEAKAGE_PATTERNS_BLOCK + LEAKAGE_PATTERNS_FLAG_ONLY

# Structured list fields — skip pattern checks (LaTeX, variables, etc.)
_STRUCTURED_LIST_FIELDS = {
    "math_expressions_latex", "variables", "units", "diagram_elements",
}

@dataclass
class QuestionDescriptionV0:
    storage_key: str
    sha256: str
    syllabus_code: str | None = None
    year: int | None = None
    session: str | None = None
    paper: int | None = None
    variant: int | None = None
    doc_type: str | None = None
    question_type: str | None = None
    math_expressions_latex: list[str] = field(default_factory=list)
    variables: list[str] = field(default_factory=list)
    units: list[str] = field(default_factory=list)
    diagram_elements: list[str] = field(default_factory=list)
    q_number: int | None = None
    subpart: str | None = None
    answer_form: AnswerForm = "other"
    confidence: float = 0.5
    summary: str | None = None
    status: str = "ok"
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "QuestionDescriptionV0":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})

def leakage_guard(data: dict) -> tuple[dict, dict]:
    """Check for leakage. Returns (data, leakage_flags). Mutates data status if blocked.

    Improvements over v0:
    - summary length limit raised to 200 chars; over-length is truncated, not blocked
    - Newline check only applies to summary (LaTeX fields legitimately contain newlines)
    - Structured list fields (math_expressions_latex, variables, units, diagram_elements)
      are exempt from pattern checks — they hold structured data, not prose
    - mark_allocation and numeric_answer patterns are flag-only (common in question text)
    """
    flags = {}
    errors = list(data.get("errors", []))
    blocked = False
    skip = {"storage_key", "sha256", "status", "errors", "leakage_flags", "raw_json",
            "provider", "model", "prompt_version", "extractor_version",
            "syllabus_code", "session", "year", "doc_type", "paper", "variant",
            "q_number", "subpart", "confidence", "answer_form", "question_type"}

    def check_text(text: str, field_name: str, *, is_summary: bool = False):
        nonlocal blocked
        hit = False

        # Length check — only summary, and truncate instead of blocking
        if is_summary and len(text) > 200:
            flags[f"{field_name}_too_long"] = len(text)
            errors.append(f"{field_name}: >200 chars (truncated)")
            data["summary"] = text[:200]
            # Flag but don't block — VLM occasionally exceeds the limit slightly
            hit = True

        # Newline check — only summary
        if is_summary and "\n" in text:
            flags[f"{field_name}_has_newline"] = True
            errors.append(f"{field_name}: has newline")
            # Clean it up instead of blocking
            data["summary"] = text.replace("\n", " ").strip()
            hit = True

        # Blocking patterns (strong leakage signals)
        for pattern, flag_name in LEAKAGE_PATTERNS_BLOCK:
            if re.search(pattern, text, re.I):
                flags[f"{field_name}_{flag_name}"] = True
                errors.append(f"{field_name}: {flag_name}")
                blocked = True
                return True

        # Flag-only patterns (common in question text, not strong leakage)
        for pattern, flag_name in LEAKAGE_PATTERNS_FLAG_ONLY:
            if re.search(pattern, text, re.I):
                flags[f"{field_name}_{flag_name}"] = True
                # Record but don't block
                hit = True

        return hit

    for key, val in data.items():
        if key in skip:
            continue
        # Skip structured list fields entirely
        if key in _STRUCTURED_LIST_FIELDS:
            continue
        if isinstance(val, str) and val:
            check_text(val, key, is_summary=(key == "summary"))
        elif isinstance(val, list):
            for i, item in enumerate(val):
                if isinstance(item, str) and item:
                    check_text(item, f"{key}[{i}]")

    if blocked:
        data["status"] = "blocked"
        data["errors"] = errors

    return data, flags

def compute_response_sha256(data: dict) -> str:
    """Compute SHA256 of structured response for audit."""
    # Exclude volatile fields
    stable = {k: v for k, v in data.items() if k not in ("status", "errors", "created_at", "updated_at")}
    return hashlib.sha256(json.dumps(stable, sort_keys=True).encode()).hexdigest()

def validate_sha256(h: str) -> bool:
    return bool(re.fullmatch(r"[a-f0-9]{64}", h))
