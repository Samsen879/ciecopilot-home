"""MS-specific prompt construction and VLM response parsing.

Builds structured prompts for Mark Scheme rubric extraction and parses
VLM responses into normalised rubric point dicts.

Requirements: 2.1, 2.2, 2.3, 2.6, 3.2, 3.3
"""
from __future__ import annotations

import json
import re

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_VALID_FT_MODES = {"none", "follow_through", "carried_accuracy", "unknown"}

_MARK_LABEL_RE = re.compile(r"^[MAB]\d+$")

_CODE_BLOCK_RE = re.compile(
    r"```(?:json)?\s*\n(.*?)\n\s*```",
    re.DOTALL,
)

_SYSTEM_PROMPT = """\
You are a CIE A-Level Mark Scheme extraction assistant.
Given a screenshot of a mark scheme for a specific question, extract every \
rubric/marking point as a structured JSON array.

Return ONLY valid JSON matching this schema (no extra text):

{
  "rubric_points": [
    {
      "mark_label": "M1",
      "description": "Use chain rule correctly",
      "marks": 1,
      "depends_on_labels": [],
      "ft_mode": "none",
      "expected_answer_latex": null,
      "confidence": 0.95
    }
  ]
}

Field rules:
- mark_label: The mark code exactly as shown (e.g. M1, A1, B1, M2).
- description: A concise description of what earns this mark.
- marks: Integer number of marks awarded (must be >= 1).
- depends_on_labels: List of mark_labels this point depends on. \
Empty list if independent.
- ft_mode: One of "none", "follow_through", "carried_accuracy". \
Use "none" unless the mark scheme explicitly indicates follow-through \
or carried accuracy.
- expected_answer_latex: The expected answer in LaTeX if applicable, \
otherwise null.
- confidence: Your confidence in the extraction accuracy (0.0 to 1.0).

Important:
- Extract ALL marking points, preserving their order.
- Each row in the mark scheme should map to one rubric point.
- If a mark label appears multiple times (e.g. two M1 marks for \
different steps), include each as a separate entry.
"""


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------


def build_ms_prompt(job: dict) -> tuple[str, str]:
    """Construct MS-specific system/user prompt for VLM.

    Parameters
    ----------
    job : dict
        Must contain at least ``q_number``.  Optional keys:
        ``subpart``, ``syllabus_code``, ``session``, ``year``,
        ``paper``, ``variant``, ``storage_key``.

    Returns
    -------
    tuple[str, str]
        ``(system_prompt, user_prompt)``
    """
    parts: list[str] = [
        "Extract all rubric/marking points from this mark scheme image."
    ]

    context_fields = {
        "syllabus_code": job.get("syllabus_code"),
        "session": job.get("session"),
        "year": job.get("year"),
        "paper": job.get("paper"),
        "variant": job.get("variant"),
        "q_number": job.get("q_number"),
        "subpart": job.get("subpart"),
    }

    ctx: list[str] = []
    for key, value in context_fields.items():
        if value is not None:
            ctx.append(f"{key}={value}")

    if ctx:
        parts.append("Question context: " + ", ".join(ctx) + ".")

    parts.append(
        "Return the result as a JSON object with a single key "
        '"rubric_points" containing an array of marking point objects.'
    )

    user_prompt = "\n".join(parts)
    return _SYSTEM_PROMPT, user_prompt


# ---------------------------------------------------------------------------
# Kind derivation
# ---------------------------------------------------------------------------


def derive_kind(mark_label: str) -> tuple[str, bool]:
    """Derive the mark kind from the first character of *mark_label*.

    Returns
    -------
    tuple[str, bool]
        ``(kind, valid)`` where *valid* is ``True`` when the first letter
        is one of ``M``, ``A``, ``B``.  For invalid labels the kind is
        set to the uppercased first character (or ``"?"`` for empty
        strings) and *valid* is ``False``.
    """
    label = mark_label.strip().upper()
    if not label:
        return ("?", False)
    first = label[0]
    if first in ("M", "A", "B"):
        return (first, True)
    return (first, False)


# ---------------------------------------------------------------------------
# Confidence heuristic
# ---------------------------------------------------------------------------

_REQUIRED_FIELDS = {"mark_label", "description", "marks"}
_OPTIONAL_FIELDS = {"depends_on_labels", "ft_mode", "expected_answer_latex"}


def _compute_heuristic_confidence(point: dict) -> float:
    """Compute a heuristic confidence when the model omits it.

    Rules (from design doc):
    - All required fields present AND mark_label valid → 0.8
    - Some optional fields missing → 0.6
    - mark_label invalid OR description very short (< 5 chars) → 0.4
    """
    label = str(point.get("mark_label", "")).strip().upper()
    description = str(point.get("description", ""))

    # Check mark_label validity
    label_valid = bool(_MARK_LABEL_RE.match(label))

    # Very short description
    short_desc = len(description.strip()) < 5

    if not label_valid or short_desc:
        return 0.4

    # Check required fields present
    has_all_required = all(
        point.get(f) is not None and point.get(f) != ""
        for f in _REQUIRED_FIELDS
    )
    if not has_all_required:
        return 0.4

    # Check optional fields
    missing_optional = sum(
        1 for f in _OPTIONAL_FIELDS if point.get(f) is None
    )
    if missing_optional > 0:
        return 0.6

    return 0.8


# ---------------------------------------------------------------------------
# Response parser
# ---------------------------------------------------------------------------


def parse_ms_response(raw_text: str, job: dict) -> list[dict] | None:
    """Parse VLM response into a list of normalised rubric point dicts.

    Supports raw JSON and markdown code-block wrapped JSON.
    Returns ``None`` on complete parse failure.

    Each returned dict contains:
        mark_label, description, marks, depends_on_labels, ft_mode,
        expected_answer_latex, confidence, confidence_source

    Normalisation rules:
    1. ``mark_label`` – stripped and uppercased.
    2. ``ft_mode`` – forced to ``"unknown"`` when not in the valid enum.
    3. ``confidence`` – filled via heuristic when missing; sets
       ``confidence_source='heuristic'``.
    """
    if not raw_text:
        return None

    # --- Step 1: extract JSON -------------------------------------------------
    parsed: dict | list | None = None

    # Try direct JSON parse
    try:
        parsed = json.loads(raw_text)
    except (json.JSONDecodeError, TypeError, ValueError):
        pass

    # Try markdown code block
    if parsed is None:
        match = _CODE_BLOCK_RE.search(raw_text)
        if match:
            try:
                parsed = json.loads(match.group(1))
            except (json.JSONDecodeError, TypeError, ValueError):
                pass

    if parsed is None:
        return None

    # --- Step 2: extract rubric_points array ----------------------------------
    points_raw: list | None = None

    if isinstance(parsed, dict):
        points_raw = parsed.get("rubric_points")
    elif isinstance(parsed, list):
        # Accept a bare array as well
        points_raw = parsed

    if not isinstance(points_raw, list):
        return None

    # --- Step 3: normalise each point -----------------------------------------
    results: list[dict] = []
    for raw_pt in points_raw:
        if not isinstance(raw_pt, dict):
            continue

        point = _normalise_point(raw_pt)
        results.append(point)

    return results if results else None


def _normalise_point(raw: dict) -> dict:
    """Normalise a single rubric point dict from VLM output."""
    # mark_label: strip + uppercase
    mark_label = str(raw.get("mark_label", "")).strip().upper()

    # description
    description = str(raw.get("description", ""))

    # marks: coerce to int, default 1
    try:
        marks = int(raw.get("marks", 1))
    except (TypeError, ValueError):
        marks = 1
    if marks < 1:
        marks = 1

    # depends_on_labels: ensure list of strings
    raw_deps = raw.get("depends_on_labels")
    if isinstance(raw_deps, list):
        depends_on_labels = [
            str(d).strip().upper() for d in raw_deps if d is not None
        ]
    else:
        depends_on_labels = []

    # ft_mode: validate enum
    ft_mode = str(raw.get("ft_mode", "none")).strip().lower()
    if ft_mode not in _VALID_FT_MODES:
        ft_mode = "unknown"

    # expected_answer_latex
    expected_answer_latex = raw.get("expected_answer_latex")
    if expected_answer_latex is not None:
        expected_answer_latex = str(expected_answer_latex)

    # confidence + confidence_source
    raw_conf = raw.get("confidence")
    if raw_conf is not None:
        try:
            confidence = float(raw_conf)
            confidence = max(0.0, min(1.0, confidence))
            confidence_source = "model"
        except (TypeError, ValueError):
            confidence = _compute_heuristic_confidence(raw)
            confidence_source = "heuristic"
    else:
        confidence = _compute_heuristic_confidence(raw)
        confidence_source = "heuristic"

    return {
        "mark_label": mark_label,
        "description": description,
        "marks": marks,
        "depends_on_labels": depends_on_labels,
        "ft_mode": ft_mode,
        "expected_answer_latex": expected_answer_latex,
        "confidence": confidence,
        "confidence_source": confidence_source,
    }
