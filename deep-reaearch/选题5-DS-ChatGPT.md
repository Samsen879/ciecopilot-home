# 选题5-DS-ChatGPT

- 原始报告标题：CIE A-Level Mathematics Accuracy Rules, Tolerance Algorithms, Premature Approximation Detection, and a Reference Python Judgement Engine
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:07:19.699Z

CIE A-Level Mathematics Accuracy Rules, Tolerance Algorithms, Premature Approximation Detection, and a Reference Python Judgement Engine
Scope, corpus, and what “accuracy rules” mean in CIE marking

This report targets Cambridge International AS & A Level Mathematics (9709) and focuses specifically on how CIE mark schemes operationalize numerical accuracy, including when they default to significant figures, when they require exact forms, and when they apply (or annotate) premature approximation. Cambridge publishes a portal for past papers, examiner reports, and specimen materials for the 9709 qualification. 
1

In CIE mark schemes, “accuracy” is not a single global tolerance; it is a mixture of:

A default numeric acceptance rule (notably “3 significant figures”, and “1 decimal place for angles in degrees”).
Question-specific overrides (“must be exact”, “AWRT”, “ignore degree symbol”, etc.).
Marking-notation semantics like AEF/OE (“Any Equivalent Form / Or Equivalent”) and AWRT (“Answer Which Rounds To”). 
2
A recognized category of error: premature approximation (PA), described explicitly in Cambridge mark scheme documentation as “basically correct work that is insufficiently accurate,” with a penalty “PA –1” in the specimen marking guidance. 
3

For “near three years” source coverage, this report pulls accuracy-related language and examples from:

May/June 2023 9709 mark schemes (e.g., 9709/11, 9709/12). 
2
Oct/Nov 2023 Mechanics mark scheme (9709/41) with numeric acceptance examples. 
4
Oct/Nov 2025 Pure Mathematics 1 mark scheme (9709/12), which includes both the default 3 s.f. rule and rich question-level “AWRT” and “Must be exact” examples. 
5
March 2025 Principal Examiner Report for Teachers, which explicitly warns about working precision and premature rounding. 
6

Where needed for definitional completeness (especially for PA), this report additionally references Cambridge’s specimen mark scheme guidance that defines PA and its penalty. 
3

CIE accuracy rules compilation
Default numeric acceptance and the “3 significant figures” baseline

Across multiple recent 9709 mark schemes, the “Mark Scheme Notes” define a default rule for numerical answers:

If a numerical answer’s required accuracy is not otherwise specified, allow an accuracy mark if the answer is correct to 3 significant figures, or would be correct to 3 significant figures if rounded. 
2
Angles in degrees are a special case: “(1 decimal place for angles in degrees)”. 
2

This is the core reason your PRD cannot rely on a single global ±0.0005: CIE’s “correct to 3 s.f.” is a relative scale tolerance whose absolute width depends on the magnitude of the correct value (e.g., ±0.0005 is too strict for large answers and too lenient for very small answers).

Allowed numeric forms and formatting conventions

CIE mark schemes explicitly allow multiple representations of non-integer answers unless the question says otherwise:

“Non-integer answers may be given as fractions, decimals or in standard form.” 
5
“Ignore superfluous zeros, provided that the degree of accuracy is not affected.” 
5
“Allow alternative conventions for notation if used consistently… e.g. commas being used as decimal points.” 
5

Implication for your engine: accuracy judgement must be decoupled from surface formatting, but you may still need format-sensitive policies (e.g., “rounded_to_dp”) when a question explicitly demands a stated dp.

“Any equivalent exact form” and what AEF/OE implies

CIE mark schemes define:

AEF/OE = “Any Equivalent Form (of answer is equally acceptable) / Or Equivalent.” 
2

Operationally, this means when the mark scheme expects an exact expression (e.g., surds, π multiples, simplified rational forms), graders accept algebraic equivalents, not just a single canonical string.

Your scoring engine therefore needs an equivalence layer (symbolic normalization + proof attempt + fallback numeric verification policy) rather than fixed string matching.

Exactness overrides and “exact value first” behaviors

Mark schemes do not just “prefer exact”; they sometimes enforce it:

A question-level marking point in Oct/Nov 2025 explicitly states: “Must be exact.” 
5
Another point in the same paper gives exact surd answers and then notes: “ISW if decimals given after the exact answers,” i.e., award the mark if the exact form is present and ignore subsequent decimal approximations. 
5

The March 2025 Principal Examiner Report reinforces this rule set in plain language:

Candidates should work to sufficient precision internally, but “exact answers must be stated exactly,” and in some contexts “exact decimal answers should not be corrected to 3 significant figures.” 
6
It gives a concrete failure mode: when an answer “was exact,” candidates who converted to a decimal and rounded to 3 s.f. “were unable to obtain the final mark.” 
6

This strongly supports your PRD requirement: accuracy_policy must be per question / per mark point, because “3 s.f.” is not globally correct—some parts demand exactness and penalize rounding.

Angle-specific rules beyond “1 dp”

In addition to the baseline “1 decimal place for angles in degrees,” mark schemes often contain micro-rules like:

“Ignore degree symbol if seen with answers.” 
5
Question-level restrictions where degrees are outright not accepted (“Answers in degrees A0” appears in a May/June 2023 trig context). 
7

This implies unit-sensitive policies are needed (deg vs rad), not just numeric tolerance.

Premature approximation as a recognized marking concept

Cambridge’s specimen mark scheme documentation defines PA:

“PA Premature Approximation (resulting in basically correct work that is insufficiently accurate)” and states a penalty: “PA –1 … deducted from A or B marks in the case of premature approximation.” 
3

Modern mark schemes also include “Premature approximation” as an annotation category (seen in Oct/Nov 2025 annotations guidance). 
5

The March 2025 examiner report ties PA to concrete practice:

“Candidates need to work to at least 4 significant figures throughout to justify a final value to 3 significant figures,” and “Many candidates rounded prematurely … which caused them to identify incorrect values from the normal distribution tables.” 
6

This gives you an evidence-based spec for PA-1 detection: insufficient intermediate precision causing a final answer outside the allowed rounding envelope.

Machine-readable rule summaries derived from CIE phrasing

A practical “CIE-like” rule library for your system can be derived directly from these texts:

Default numeric (non-angle): {mode: "sf", sf: 3, allow_more_precision: true} because marks are allowed if the answer is correct to 3 s.f. or would be if rounded. 
5
Default angle in degrees: {mode: "dp", dp: 1, allow_more_precision: true, unit: "deg"}. 
5
Exact required: {mode: "exact", equivalence: "AEF"} when a mark point says “Must be exact.” 
5
AWRT marking points: treat as {mode: "sf" or "dp", allow_more_precision: true} but with the “rounded-to” target explicitly given in the mark scheme (“AWRT Answer Which Rounds To”). 
2
PA sensitivity guidance: set a diagnostic threshold such as “intermediate precision should be ≥ final required s.f. + 1 digit” (CIE explicitly mentions 4 s.f. working to justify 3 s.f. final). 
6
Tolerance window algorithms for sf, dp, and “answer which rounds to”

This section answers: given an accuracy_policy like {mode:"sf", sf:3, allow_more_precision:true}, how do we compute the acceptance tolerance automatically (and robustly)?

Core idea: replicate “AWRT” by comparing rounded forms, not by fixed epsilon

CIE’s default acceptance rule is explicitly “correct to 3 s.f. or would be correct if rounded.” 
5

That is algorithmically best modeled as:

Compute the correctly rounded target R = round(V, policy) (using the policy’s rounding rule).
Accept student value A if round(A, policy) == R.

This avoids the trap of choosing a constant epsilon and automatically yields a tolerance window that scales with magnitude for significant figures.

Decimal-place policy (dp): tolerance/interval construction

Let the policy be {mode:"dp", dp: d, allow_more_precision:true} and let R = round_dp(V, d).

Define the unit in the last place:

step = 10^{-d}

Under standard “round half up” behavior (the most common exam rounding convention), the set of values that round to R is the interval:

If R ≥ 0: [R − step/2, R + step/2)
If R < 0: (R − step/2, R + step/2]

The asymmetry arises because “half up” tie-breaking pushes midpoints away from zero.

In practical auto-marking, you often implement this more robustly as rounded-form equality (preferred) and only compute intervals for debugging/explanations (e.g., “accepted because your answer rounds to 1.23”).

Significant-figure policy (sf): scale-dependent step size

Let the policy be {mode:"sf", sf: s, allow_more_precision:true} and let R = round_sf(V, s).

If R ≠ 0, define:

k = floor(log10(|R|)) (order of magnitude)
step = 10^{k − s + 1}

Then the rounding-acceptance interval is:

If R ≥ 0: [R − step/2, R + step/2)
If R < 0: (R − step/2, R + step/2]

Example intuition: if the correct rounded answer is R = 1230 (3 s.f.), then k = 3 and step = 10^{3−3+1}=10, so the acceptance band is about ±5 around 1230.

Handling zero and near-zero for sf

log10(0) is undefined. If the exact correct value is exactly zero and the policy is significant figures, you need a convention. Two defensible choices:

Treat it as a dp-like requirement under the hood (rarely used in exam questions).
Define step = 10^{-s+1} and accept values rounding to 0 at that implied scale.

In production systems, the safest approach is to avoid sf policies for answers expected to be 0 unless the mark scheme explicitly uses sf language for that mark point.

“rounded_to_sf” vs “sf”: decoupling numeric correctness from format constraints

Your PRD distinguishes sf and rounded_to_sf. A CIE-aligned interpretation is:

sf with allow_more_precision:true: accept any value that rounds correctly (the CIE default). 
5
rounded_to_sf: accept sf-correct values and assert the candidate has stated at least sf significant digits (useful if your product enforces “state your answer to …”). This aligns with mark scheme annotations like “Error in number of significant figures” being a distinct marking concept. 
5
“Ignore superfluous zeros” means you should not reject answers solely for having extra trailing zeros that do not change the numeric value. 
5
Boundary cases and “tie” behavior: why Decimal-based rounding is recommended

If you attempt to compute the interval using IEEE-754 floats, you will encounter representational artifacts (e.g., 0.1 not exactly representable), making boundary checks unstable. Python’s own tutorial explains that floats are binary fractions and shows the classic 0.1 + 0.2 display anomaly. 
8

For dp/sf rounding judgments that are defined in decimal, it is better to use decimal arithmetic (decimal.Decimal), whose documentation explicitly contrasts decimal exactness with binary float issues and notes how float equality tests can fail due to tiny residuals. 
9

Premature approximation detection (PA-1): what to backtrack and how to score it
What CIE indicates about premature approximation

Cambridge defines Premature Approximation (PA) as “basically correct work that is insufficiently accurate” and documents a “PA –1” penalty in its marking guidance. 
3

In the March 2025 examiner report, a practical mechanism is described: to justify a final answer to 3 s.f., candidates should work to at least 4 s.f., and many candidates rounded prematurely in normal approximation questions, leading to wrong table lookups. 
6

Separately, mark schemes sometimes explicitly demand exact intermediate substitution: e.g., “the exact value of the trig ratio substituted before the final answer is needed.” 
5

Operational definition of PA-1 for an automated system

A workable PA-1 definition for your engine:

PA-1 triggers when all are true:

The student’s final answer is outside the acceptance window defined by the mark point’s accuracy_policy.
The student’s underlying method is consistent with the canonical solution (e.g., correct formula/structure), but
The failure can be explained by using low-precision approximations at intermediate steps, such that recomputing the same method with sufficient working precision would land inside the acceptance window.

In other words, PA-1 is a counterfactual diagnosis: “same method + higher precision ⇒ correct.”

What intermediate variables to backtrack

You do not need every intermediate; you need the few that are both:

Numerically sensitive (errors propagate strongly), and
Likely to be rounded prematurely.

In A-Level math (9709), the high-yield backtracking targets are:

Values pulled from tables or discretized lookups (normal distribution z-tables): early rounding changes which row/column is selected. 
6
Transcendentals and circle constants: π, trig values, log/exp evaluations (especially when the mark scheme asks for exact forms or exact trig ratios). 
5
Intermediate results reused across parts (common in multi-part questions) where students round a previous answer before using it downstream.
Situations where mark schemes accept “X or better (exact value…)” indicating that additional precision is expected and tolerated (example: distance marking allows “21.1 or better (21.09375)”). 
4
A practical PA-1 detection algorithm

Assume you have (or can request) a student work trace (step-by-step) where intermediate values are captured as expressions or numbers.

Inputs:

Canonical solution DAG with named intermediates: {u1 = expr1, u2 = expr2(u1), …, final = exprF(u*)}
Student trace with their computed numeric values {u1 ≈ a1, u2 ≈ a2, …, final ≈ A} (possibly partial)
Final mark point accuracy_policy defining acceptance

Algorithm:

Check final correctness: if final passes policy, stop (no PA-1).
Identify suspect intermediates:
Any intermediate value written with “low digits” (e.g., 3.14, 0.707, 1.41).
Any intermediate that is a decimal truncation of a value that should be exact per mark scheme (e.g., surds/π forms). 
5
For each suspect intermediate ui, compute:
Canonical high-precision value vi (symbolic or high-precision numeric)
Student value ai
Determine whether ai is consistent with rounding vi to a small sf/dp (reverse-round inference).
Counterfactual recomputation:
Recompute the student’s final method using the canonical expression but substituting:
all non-suspect intermediates with student values (to preserve their path), and
suspect intermediates with high-precision values (or intervals).
If the counterfactual final value now passes the mark point policy, flag PA-1 and attribute it to the minimal subset of intermediates required to “repair” the answer.
Emit a PA-1 explanation:
“Your final answer is outside the accepted rounding range, but it would be correct if you carried more precision in intermediate value(s): [list].”

Complexity:

Let n be number of suspect intermediates and C_eval(m,p) be the cost to evaluate the final expression of size m at precision p.
Naïve per-intermediate counterfactual checks are O(n · C_eval).
A greedy “minimal subset” search is O(n · C_eval); exact minimal subset search is exponential and not needed for scoring UX.
With symbolic differentiation (optional), you can approximate error impact in near O(C_eval + C_grad), where C_grad is the cost to compute a gradient once, and then rank suspects by sensitivity.
Important limitation

If you only capture the final answer and not the intermediate work, PA-1 cannot be reliably determined; a wrong final answer could come from conceptual errors, arithmetic slips, or premature rounding. CIE’s own framing treats PA as “basically correct work” that becomes inaccurate, which is intrinsically work-dependent. 
3

Robust numeric comparison for education scoring
Why IEEE-754 float comparisons are risky here

Education scoring needs deterministic, explainable comparisons under decimal rounding rules (s.f./d.p.). IEEE-754 binary floats undermine that because many simple decimals are not exactly representable; Python documents this directly and shows why results like 0.1 + 0.2 may display as 0.30000000000000004. 
8

The decimal module documentation further highlights that decimal floating point can represent numbers like 0.1 exactly and contrasts this with binary float residuals that “prevent reliable equality testing.” 
9

For deeper numerical-analysis background on rounding error, cancellation, and floating-point pitfalls, Goldberg’s classic tutorial remains a standard reference. 
10

Should you “avoid float entirely” by using SymPy Rational everywhere?

Using exact rationals is excellent for:

Finite decimals (e.g., 3.14 = 157/50)
Rational expressions (fractions, terminating decimals, many algebraic manipulations)

But it is not sufficient alone because many correct answers involve irrationals/transcendentals (π, √2, trig of non-special angles). A hybrid strategy is more robust:

Parse student answers into a symbolic expression when possible.
Keep exact atoms exact (Integer, Rational, π, √, etc.).
Use arbitrary-precision numeric evaluation only when needed (e.g., final rounding check), and use decimal rounding rules for sf/dp.

SymPy’s docs explicitly show that using Python floats as inputs can inject base-2 artifacts (e.g., Float(0.1, 30) gives a value reflecting binary float inaccuracy), and recommend using strings or Rational to construct high-precision decimals exactly. 
11

SymPy also documents evalf/N behavior and discusses numerical evaluation error tracking and precision management. 
11

SymPy best practices note that a Float can be converted to an exact Rational (or approximated nicely with nsimplify)—useful when interpreting student-provided decimals. 
12

Recommended numeric stack for an accuracy engine

A CIE-aligned, production-friendly stack:

Parsing / equivalence: SymPy expression model for AEF/OE acceptance. 
2
Decimal rounding + tolerance windows: decimal.Decimal with explicit rounding mode (e.g., HALF_UP) for dp/sf rounding boundaries, consistent with exam rounding expectations and avoiding IEEE-754 surprises. 
9
High precision numeric evaluation: SymPy evalf/N (mpmath backend) at a precision chosen from the policy (sf/dp + guard digits), because SymPy supports arbitrary precision evaluation beyond float64. 
13
Reference Python implementation blueprint with API, schema, and a 50+ test library

This section provides a concrete implementation plan and a reference implementation that you can adapt into your scoring pipeline.

API design goals

The engine should support:

Per-mark-point policies (your PRD requirement).
Exact (AEF) equivalence when required.
AWRT-style numeric acceptance for sf/dp.
Optional format enforcement (rounded_to_sf, rounded_to_dp).
Optional PA-1 detection when intermediate work is available.

Proposed public API:

python
复制
decision = judge_answer(
    student_input="872.222",
    correct_expr="2500*pi/9",
    policy={"mode": "sf", "sf": 3, "allow_more_precision": True},
    context={"unit": None}
)

pa = detect_pa1(
    student_trace={...},
    canonical_model={...},
    final_policy={...}
)

Configuration schema

A JSON Schema (draft 2020-12) that matches the implementation below:

json
复制
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "AccuracyPolicy",
  "type": "object",
  "required": ["mode"],
  "properties": {
    "mode": {
      "type": "string",
      "enum": ["exact", "sf", "dp", "rounded_to_sf", "rounded_to_dp"]
    },
    "sf": { "type": "integer", "minimum": 1 },
    "dp": { "type": "integer", "minimum": 0 },
    "allow_more_precision": { "type": "boolean", "default": true },
    "unit": { "type": ["string", "null"], "enum": ["deg", "rad", null], "default": null },
    "allow_decimal_comma": { "type": "boolean", "default": true },
    "rounding": {
      "type": "string",
      "enum": ["half_up"],
      "default": "half_up"
    }
  },
  "allOf": [
    {
      "if": { "properties": { "mode": { "const": "sf" } } },
      "then": { "required": ["sf"] }
    },
    {
      "if": { "properties": { "mode": { "const": "rounded_to_sf" } } },
      "then": { "required": ["sf"] }
    },
    {
      "if": { "properties": { "mode": { "const": "dp" } } },
      "then": { "required": ["dp"] }
    },
    {
      "if": { "properties": { "mode": { "const": "rounded_to_dp" } } },
      "then": { "required": ["dp"] }
    }
  ]
}

Reference implementation
python
复制
# accuracy_engine.py
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, localcontext, ROUND_HALF_UP
import math
import re
from typing import Any, Dict, Optional, Tuple, Literal

# Optional dependency (recommended) for AEF/OE exact equivalence and robust eval.
import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor,
)

Mode = Literal["exact", "sf", "dp", "rounded_to_sf", "rounded_to_dp"]
Unit = Optional[Literal["deg", "rad"]]


@dataclass(frozen=True)
class AccuracyPolicy:
    mode: Mode
    sf: Optional[int] = None
    dp: Optional[int] = None
    allow_more_precision: bool = True
    unit: Unit = None
    allow_decimal_comma: bool = True
    rounding: Literal["half_up"] = "half_up"

    def validate(self) -> None:
        if self.mode in ("sf", "rounded_to_sf") and (self.sf is None or self.sf < 1):
            raise ValueError("sf must be provided and >= 1 for sf/rounded_to_sf")
        if self.mode in ("dp", "rounded_to_dp") and (self.dp is None or self.dp < 0):
            raise ValueError("dp must be provided and >= 0 for dp/rounded_to_dp")
        if self.rounding != "half_up":
            raise ValueError("Only half_up rounding is supported in this reference engine.")


@dataclass(frozen=True)
class AcceptanceInterval:
    lower: Decimal
    upper: Decimal
    lower_closed: bool
    upper_closed: bool

    def contains(self, x: Decimal) -> bool:
        if self.lower_closed:
            if x < self.lower:
                return False
        else:
            if x <= self.lower:
                return False
        if self.upper_closed:
            if x > self.upper:
                return False
        else:
            if x >= self.upper:
                return False
        return True


@dataclass(frozen=True)
class Decision:
    is_correct: bool
    reason: str
    student_value: Optional[str] = None
    correct_value: Optional[str] = None
    rounded_target: Optional[str] = None
    interval: Optional[AcceptanceInterval] = None


# ---------------------------
# Parsing & normalization
# ---------------------------

_DEGREE_SYMBOLS = ["°", "\u00b0"]

def normalize_text(s: str, *, allow_decimal_comma: bool) -> str:
    s = s.strip()

    # Remove degree symbols (unit handling is done separately)
    for sym in _DEGREE_SYMBOLS:
        s = s.replace(sym, "")

    # Normalize unicode multiplication/division signs
    s = s.replace("×", "*").replace("÷", "/")

    # If comma is used as decimal separator and there's no dot, convert comma->dot.
    # (CIE allows commas as decimal points if used consistently.) citeturn3view0turn9view1
    if allow_decimal_comma:
        if "," in s and "." not in s:
            # Avoid common thousands separator patterns; this is heuristic.
            # If multiple commas exist, assume not a decimal input.
            if s.count(",") == 1:
                s = s.replace(",", ".")
    return s


def safe_parse_sympy(expr_str: str) -> sp.Expr:
    """Parse a student expression with a restricted local namespace."""
    allowed = {
        "pi": sp.pi,
        "E": sp.E,
        "e": sp.E,
        "sqrt": sp.sqrt,
        "sin": sp.sin,
        "cos": sp.cos,
        "tan": sp.tan,
        "asin": sp.asin,
        "acos": sp.acos,
        "atan": sp.atan,
        "ln": sp.log,
        "log": sp.log,
        "Abs": sp.Abs,
    }
    trans = standard_transformations + (implicit_multiplication_application, convert_xor)
    parsed = parse_expr(expr_str, local_dict=allowed, transformations=trans, evaluate=True)

    # Convert any SymPy Floats into exact rationals using their base-10 string.
    # This aligns with treating a typed finite decimal as exact. citeturn6search3turn6search12
    floats = list(parsed.atoms(sp.Float))
    if floats:
        repl = {f: sp.Rational(str(f)) for f in floats}
        parsed = parsed.xreplace(repl)

    return sp.simplify(parsed)


def expr_is_numeric(expr: sp.Expr) -> bool:
    return len(expr.free_symbols) == 0


# ---------------------------
# Decimal conversion & rounding
# ---------------------------

def _eval_to_decimal(expr: sp.Expr, precision_digits: int) -> Decimal:
    """
    Evaluate a SymPy expression to a Decimal string via high-precision evalf,
    then convert to Decimal without IEEE-754 float round-trip.
    """
    if not expr_is_numeric(expr):
        raise ValueError("Expression is not numeric.")

    # Exact rational/integer can be converted directly.
    if expr.is_Integer or expr.is_Rational:
        return Decimal(str(expr))

    # High precision evalf for irrationals/transcendentals. citeturn5search3turn6search9
    with localcontext() as ctx:
        ctx.prec = max(precision_digits, 50)
        val = sp.N(expr, ctx.prec)  # SymPy high precision float
        return Decimal(str(val))


def round_dp(x: Decimal, dp: int) -> Decimal:
    q = Decimal(1).scaleb(-dp)  # 10**(-dp)
    return x.quantize(q, rounding=ROUND_HALF_UP)


def round_sf(x: Decimal, sf: int) -> Decimal:
    if x.is_zero():
        return Decimal(0)
    # Decimal.adjusted() is floor(log10(abs(x))) for non-zero numbers
    k = x.copy_abs().adjusted()
    q_exp = k - sf + 1
    q = Decimal(1).scaleb(q_exp)
    return x.quantize(q, rounding=ROUND_HALF_UP)


def acceptance_interval_dp(target: Decimal, dp: int) -> AcceptanceInterval:
    step = Decimal(1).scaleb(-dp)
    half = step / 2
    if target >= 0:
        return AcceptanceInterval(target - half, target + half, True, False)
    else:
        return AcceptanceInterval(target - half, target + half, False, True)


def acceptance_interval_sf(target: Decimal, sf: int) -> AcceptanceInterval:
    if target.is_zero():
        step = Decimal(1).scaleb(-sf + 1)
    else:
        k = target.copy_abs().adjusted()
        step = Decimal(1).scaleb(k - sf + 1)
    half = step / 2
    if target >= 0:
        return AcceptanceInterval(target - half, target + half, True, False)
    else:
        return AcceptanceInterval(target - half, target + half, False, True)


# ---------------------------
# Format checks (rounded_to_*)
# ---------------------------

_NUM_RE = re.compile(r"^[+-]?\d+(\.\d+)?([eE][+-]?\d+)?$")

def count_decimal_places(raw: str) -> Optional[int]:
    """Count decimal places in a simple decimal literal (not full expression)."""
    if not _NUM_RE.match(raw):
        return None
    base = raw.lower().split("e")[0]
    if "." not in base:
        return 0
    return len(base.split(".")[1])

def count_sig_figs(raw: str) -> Optional[int]:
    """
    Count significant figures in a numeric literal.
    Rules used (typical exam convention):
      - Leading zeros not significant.
      - Trailing zeros in integers without decimal point not significant.
      - Trailing zeros after decimal point are significant.
      - For scientific notation, count sig figs in coefficient.
    """
    if not _NUM_RE.match(raw):
        return None
    s = raw.strip().lower()
    if "e" in s:
        coeff = s.split("e")[0]
        return count_sig_figs(coeff)

    # Remove sign
    if s[0] in "+-":
        s = s[1:]

    if "." in s:
        left, right = s.split(".", 1)
        digits = (left + right)
        digits = digits.lstrip("0")
        if digits == "":
            return 1  # "0.0" style edge; treat as 1 sig fig
        # In decimals, trailing zeros after decimal are significant
        return len(digits)
    else:
        # Integer: trailing zeros not significant
        s2 = s.lstrip("0")
        if s2 == "":
            return 1
        s2 = s2.rstrip("0")
        return len(s2)


# ---------------------------
# Judgement engine
# ---------------------------

def judge_answer(
    student_input: str,
    correct_expr: str,
    policy_dict: Dict[str, Any],
) -> Decision:
    policy = AccuracyPolicy(**policy_dict)
    policy.validate()

    s_norm = normalize_text(student_input, allow_decimal_comma=policy.allow_decimal_comma)
    c_norm = normalize_text(correct_expr, allow_decimal_comma=False)

    try:
        s_expr = safe_parse_sympy(s_norm)
    except Exception as e:
        return Decision(False, f"parse_error:student:{e}")

    try:
        c_expr = safe_parse_sympy(c_norm)
    except Exception as e:
        return Decision(False, f"parse_error:correct:{e}")

    if not expr_is_numeric(s_expr):
        return Decision(False, "student_expression_not_numeric")

    if policy.mode == "exact":
        # Any Equivalent Form acceptance: check symbolic equality. citeturn9view0turn4view0
        diff = sp.simplify(s_expr - c_expr)
        if diff == 0 or diff.equals(0):
            return Decision(True, "exact_equivalent", student_value=str(s_expr), correct_value=str(c_expr))
        return Decision(False, "not_exact_equivalent", student_value=str(s_expr), correct_value=str(c_expr))

    # Numeric modes: evaluate at high precision then do Decimal rounding logic.
    # Choose working precision with guard digits
    guard = 20
    prec = 80
    if policy.mode in ("dp", "rounded_to_dp") and policy.dp is not None:
        prec = max(prec, policy.dp + guard)
    if policy.mode in ("sf", "rounded_to_sf") and policy.sf is not None:
        prec = max(prec, policy.sf + guard)

    try:
        s_val = _eval_to_decimal(s_expr, prec)
        c_val = _eval_to_decimal(c_expr, prec)
    except Exception as e:
        return Decision(False, f"eval_error:{e}", student_value=str(s_expr), correct_value=str(c_expr))

    if policy.mode in ("dp", "rounded_to_dp"):
        assert policy.dp is not None
        target = round_dp(c_val, policy.dp)
        interval = acceptance_interval_dp(target, policy.dp)

        if policy.allow_more_precision:
            ok = (round_dp(s_val, policy.dp) == target)
        else:
            ok = (s_val == target)

        if ok and policy.mode == "rounded_to_dp":
            dp_count = count_decimal_places(s_norm)
            # Require stated dp (at least). Extra trailing zeros are allowed. citeturn3view0turn9view1
            if dp_count is None or dp_count < policy.dp:
                return Decision(False, "format_error_dp", str(s_val), str(c_val), str(target), interval)

        return Decision(ok, "ok" if ok else "numeric_mismatch_dp", str(s_val), str(c_val), str(target), interval)

    if policy.mode in ("sf", "rounded_to_sf"):
        assert policy.sf is not None
        target = round_sf(c_val, policy.sf)
        interval = acceptance_interval_sf(target, policy.sf)

        if policy.allow_more_precision:
            ok = (round_sf(s_val, policy.sf) == target)
        else:
            ok = (s_val == target)

        if ok and policy.mode == "rounded_to_sf":
            sf_count = count_sig_figs(s_norm)
            # Require at least sf stated sig figs (but do not reject extra precision).
            if sf_count is None or sf_count < policy.sf:
                return Decision(False, "format_error_sf", str(s_val), str(c_val), str(target), interval)

        return Decision(ok, "ok" if ok else "numeric_mismatch_sf", str(s_val), str(c_val), str(target), interval)

    return Decision(False, "unsupported_mode")


# ---------------------------
# PA-1 detection (reference)
# ---------------------------

@dataclass(frozen=True)
class PA1Result:
    is_pa1: bool
    suspects: Tuple[str, ...]
    message: str


def detect_pa1(
    *,
    canonical_final_expr: str,
    student_final: str,
    final_policy: Dict[str, Any],
    student_intermediates: Dict[str, str],
    canonical_intermediates: Dict[str, str],
    suspect_constants: Tuple[str, ...] = ("3.14", "22/7", "1.41", "1.414", "0.707", "0.866"),
) -> PA1Result:
    """
    Lightweight PA-1 detector:
      - If final answer is wrong,
      - and the student intermediates include suspicious approximations,
      - and replacing those with canonical high-precision intermediates makes the final correct,
      then flag PA-1.

    This assumes you have a step trace (intermediate values). Without it, PA-1 is not reliable. citeturn2view1turn13view0
    """
    # Final correctness check
    dec = judge_answer(student_final, canonical_final_expr, final_policy)
    if dec.is_correct:
        return PA1Result(False, (), "Final answer is already correct; PA-1 not applicable.")

    # Identify suspect variables by pattern in student intermediates
    suspects = []
    for var, sval in student_intermediates.items():
        sval_norm = normalize_text(sval, allow_decimal_comma=True)
        if any(tok in sval_norm for tok in suspect_constants):
            suspects.append(var)

    if not suspects:
        return PA1Result(False, (), "Final answer incorrect, but no clear premature-approximation signature found in intermediates.")

    # Counterfactual: substitute canonical intermediates for suspect vars in student's final expression (if it references vars)
    # Here we implement a minimal version: we rebuild a 'student_final_expr' by replacing variables with student/canonical constants.
    # In real systems, you would parse the student's expression tree and do systematic substitution.
    try:
        final_expr = safe_parse_sympy(normalize_text(student_final, allow_decimal_comma=True))
    except Exception:
        return PA1Result(False, tuple(suspects), "Could not parse student final expression for PA-1 counterfactual check.")

    sub_map = {}
    for var, sval in student_intermediates.items():
        try:
            sub_map[sp.Symbol(var)] = safe_parse_sympy(normalize_text(sval, allow_decimal_comma=True))
        except Exception:
            pass

    # Replace suspect vars with canonical values (higher precision / exact)
    for var in suspects:
        if var in canonical_intermediates:
            try:
                sub_map[sp.Symbol(var)] = safe_parse_sympy(normalize_text(canonical_intermediates[var], allow_decimal_comma=False))
            except Exception:
                pass

    cf_expr = sp.simplify(final_expr.subs(sub_map))
    cf_dec = judge_answer(str(cf_expr), canonical_final_expr, final_policy)

    if cf_dec.is_correct:
        msg = (
            "PA-1 detected: final answer is incorrect under the marking tolerance, but becomes correct "
            "if suspect intermediate approximations are replaced with higher-precision (canonical) values. "
            f"Suspects: {suspects}."
        )
        return PA1Result(True, tuple(suspects), msg)

    return PA1Result(False, tuple(suspects), "Suspect approximations found, but counterfactual recomputation did not repair the final answer.")

Boundary test suite (60+ cases)
python
复制
# test_accuracy_engine.py
import pytest
from decimal import Decimal
from accuracy_engine import judge_answer, detect_pa1

# ---------------------------
# sf / dp acceptance (AWRT)
# ---------------------------

@pytest.mark.parametrize(
    "correct, student, policy, expected",
    [
        # dp=2, correct rounds to 1.23
        ("1.234", "1.23", {"mode": "dp", "dp": 2, "allow_more_precision": True}, True),
        ("1.234", "1.234", {"mode": "dp", "dp": 2, "allow_more_precision": True}, True),
        ("1.234", "1.235", {"mode": "dp", "dp": 2, "allow_more_precision": True}, False),  # tie goes to 1.24
        ("1.234", "1.2249999", {"mode": "dp", "dp": 2, "allow_more_precision": True}, False),

        # dp=2, negative boundary behavior
        ("-1.234", "-1.23", {"mode": "dp", "dp": 2, "allow_more_precision": True}, True),
        ("-1.234", "-1.225", {"mode": "dp", "dp": 2, "allow_more_precision": True}, True),  # tie -> -1.23
        ("-1.234", "-1.235", {"mode": "dp", "dp": 2, "allow_more_precision": True}, False), # tie -> -1.24

        # sf=3, scale-dependent
        ("1234", "1234", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),      # rounds to 1230
        ("1234", "1230", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),
        ("1234", "1225", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),      # lower boundary
        ("1234", "1235", {"mode": "sf", "sf": 3, "allow_more_precision": True}, False),     # tie -> 1240

        # sf=3, small magnitude
        ("0.012345", "0.012349", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),  # rounds to 0.0123
        ("0.012345", "0.012351", {"mode": "sf", "sf": 3, "allow_more_precision": True}, False), # rounds to 0.0124

        # sf=3, exact fraction accepted if rounds correctly (CIE allows fractions unless specified) citeturn3view0turn9view1
        ("1/3", "0.3333", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),
        ("1/3", "1/3", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),

        # decimal comma acceptance (notation rule) citeturn3view0turn9view1
        ("1.23", "1,23", {"mode": "dp", "dp": 2, "allow_more_precision": True, "allow_decimal_comma": True}, True),

        # superfluous zeros accepted citeturn3view0turn9view1
        ("1.23", "1.23000", {"mode": "dp", "dp": 2, "allow_more_precision": True}, True),
        ("1.23", "1.23000", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),
    ],
)
def test_awrt_acceptance(correct, student, policy, expected):
    d = judge_answer(student, correct, policy)
    assert d.is_correct == expected, d


# ---------------------------
# strict modes: rounded_to_dp / rounded_to_sf
# ---------------------------

@pytest.mark.parametrize(
    "correct, student, policy, expected_reason",
    [
        ("1.234", "1.2", {"mode": "rounded_to_dp", "dp": 2, "allow_more_precision": True}, "format_error_dp"),
        ("1.234", "1.23", {"mode": "rounded_to_dp", "dp": 2, "allow_more_precision": True}, "ok"),
        ("1.234", "1.2300", {"mode": "rounded_to_dp", "dp": 2, "allow_more_precision": True}, "ok"),

        ("1.2", "1.2", {"mode": "rounded_to_sf", "sf": 3, "allow_more_precision": True}, "format_error_sf"),
        ("1.2", "1.20", {"mode": "rounded_to_sf", "sf": 3, "allow_more_precision": True}, "ok"),
        ("1.2", "1.2000", {"mode": "rounded_to_sf", "sf": 3, "allow_more_precision": True}, "ok"),
        ("120", "120", {"mode": "rounded_to_sf", "sf": 3, "allow_more_precision": True}, "format_error_sf"),  # 120 is 2 sf by convention
        ("120", "1.20e2", {"mode": "rounded_to_sf", "sf": 3, "allow_more_precision": True}, "ok"),
    ],
)
def test_strict_formatting(correct, student, policy, expected_reason):
    d = judge_answer(student, correct, policy)
    assert d.reason == expected_reason, d


# ---------------------------
# allow_more_precision = False (exactly the rounded target)
# ---------------------------

@pytest.mark.parametrize(
    "correct, student, policy, expected",
    [
        ("1.234", "1.234", {"mode": "dp", "dp": 2, "allow_more_precision": False}, False),  # must equal 1.23
        ("1.234", "1.23", {"mode": "dp", "dp": 2, "allow_more_precision": False}, True),

        ("1234", "1234", {"mode": "sf", "sf": 3, "allow_more_precision": False}, False),   # must equal 1230
        ("1234", "1230", {"mode": "sf", "sf": 3, "allow_more_precision": False}, True),
    ],
)
def test_allow_more_precision_false(correct, student, policy, expected):
    d = judge_answer(student, correct, policy)
    assert d.is_correct == expected, d


# ---------------------------
# exact equivalence (AEF/OE)
# ---------------------------

@pytest.mark.parametrize(
    "correct, student, expected",
    [
        ("sqrt(2)/2", "1/sqrt(2)", True),
        ("pi/6", "pi/12 + pi/12", True),
        ("(3/2)", "1.5", True),   # exact rational equivalence
        ("sqrt(2)", "1.414", False),
    ],
)
def test_exact_mode(correct, student, expected):
    d = judge_answer(student, correct, {"mode": "exact"})
    assert d.is_correct == expected, d


# ---------------------------
# more sf/dp edge cases
# ---------------------------

@pytest.mark.parametrize(
    "correct, student, policy, expected",
    [
        # dp=0 (nearest integer)
        ("2.5", "2", {"mode": "dp", "dp": 0, "allow_more_precision": True}, False),
        ("2.5", "3", {"mode": "dp", "dp": 0, "allow_more_precision": True}, True),

        # sf across powers of 10
        ("999.5", "1000", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),
        ("999.5", "999", {"mode": "sf", "sf": 3, "allow_more_precision": True}, False),

        # very small with sf
        ("0.00098765", "0.000988", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),
        ("0.00098765", "0.000987", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),
        ("0.00098765", "0.000986", {"mode": "sf", "sf": 3, "allow_more_precision": True}, False),

        # integers and sf
        ("3120", "3120", {"mode": "rounded_to_sf", "sf": 3, "allow_more_precision": True}, True),   # 3120 treated as 3 sf
        ("3120", "3.12e3", {"mode": "rounded_to_sf", "sf": 3, "allow_more_precision": True}, True),

        # parsing implicit multiplication / XOR conversion
        ("2^3", "8", {"mode": "exact"}, True),
        ("2pi", "2*pi", {"mode": "exact"}, True),
    ],
)
def test_more_edges(correct, student, policy, expected):
    d = judge_answer(student, correct, policy)
    assert d.is_correct == expected, d


# ---------------------------
# PA-1 detection tests
# ---------------------------

def test_pa1_sector_area_pi_approx():
    # Exact area: (theta/360)*pi*r^2 with theta=100, r=10 => 2500*pi/9 ~ 872.664
    canonical_final = "2500*pi/9"
    final_policy = {"mode": "sf", "sf": 3, "allow_more_precision": True}

    # Student used pi=3.14 early:
    student_intermediates = {
        "pi_used": "3.14",
        "area": "2500*pi_used/9"
    }
    canonical_intermediates = {
        "pi_used": "pi",
        "area": "2500*pi/9"
    }

    pa = detect_pa1(
        canonical_final_expr=canonical_final,
        student_final="2500*pi_used/9",
        final_policy=final_policy,
        student_intermediates=student_intermediates,
        canonical_intermediates=canonical_intermediates,
        suspect_constants=("3.14",),
    )
    assert pa.is_pa1 is True, pa

def test_pa1_not_triggered_when_final_ok():
    canonical_final = "pi"
    final_policy = {"mode": "sf", "sf": 3, "allow_more_precision": True}

    student_intermediates = {"pi_used": "3.14"}
    canonical_intermediates = {"pi_used": "pi"}

    # Student final is "3.14" which rounds to 3.14 (3 sf) and matches pi to 3 sf
    pa = detect_pa1(
        canonical_final_expr=canonical_final,
        student_final="3.14",
        final_policy=final_policy,
        student_intermediates=student_intermediates,
        canonical_intermediates=canonical_intermediates,
        suspect_constants=("3.14",),
    )
    assert pa.is_pa1 is False, pa


# ---------------------------
# additional coverage: 50+ quick checks using parametrization
# ---------------------------

@pytest.mark.parametrize(
    "correct, student, policy, expected",
    [
        ("10/3", "3.33", {"mode": "dp", "dp": 2, "allow_more_precision": True}, True),
        ("10/3", "3.32", {"mode": "dp", "dp": 2, "allow_more_precision": True}, False),

        ("-10/3", "-3.33", {"mode": "dp", "dp": 2, "allow_more_precision": True}, True),
        ("-10/3", "-3.32", {"mode": "dp", "dp": 2, "allow_more_precision": True}, False),

        ("sqrt(3)", "1.73", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),
        ("sqrt(3)", "1.72", {"mode": "sf", "sf": 3, "allow_more_precision": True}, False),

        ("pi", "3.1416", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),
        ("pi", "3.15", {"mode": "sf", "sf": 3, "allow_more_precision": True}, False),

        ("1", "0.9996", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),  # rounds to 1.00
        ("1", "0.9994", {"mode": "sf", "sf": 3, "allow_more_precision": True}, False),

        ("1000", "999.6", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),
        ("1000", "999.4", {"mode": "sf", "sf": 3, "allow_more_precision": True}, False),

        ("0.1", "0.10000000000000004", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),
        ("0.3", "0.1+0.2", {"mode": "sf", "sf": 3, "allow_more_precision": True}, True),
    ],
)
def test_bulk_extra(correct, student, policy, expected):
    d = judge_answer(student, correct, policy)
    assert d.is_correct == expected, d

How this implementation maps to CIE wording
The default sf/dp behavior uses “round-and-compare” consistent with “would be correct … if rounded” (AWRT-style acceptance). 
5
exact mode is designed to operationalize AEF/OE (“Any Equivalent Form”). 
2
PA-1 detection is framed as “basically correct work … insufficiently accurate” and uses a counterfactual repair test, matching Cambridge’s PA concept and the examiner report’s emphasis that premature rounding causes final inaccuracies. 
3
Implementation extensions you will likely need in production

To fully satisfy all “CIE per question / per scoring point” nuance observed in mark schemes and reports, the reference engine should be extended with:

Unit-aware comparisons (e.g., deg vs rad) because mark schemes can reject degrees in a radians domain. 
7
Question-specific acceptance sets beyond strict dp/sf (e.g., lists of roots with domain constraints; AWRT tags attached to each root). 
5
Explicit “must be exact” enforcement (already supported as exact) and more granular mark-point configurations where “exact” is required only for part of an answer vector. 
5
A richer PA-1 engine that anchors on the examiner report guidance: working precision should be at least final s.f. + 1 digit, and table-lookup steps should preserve enough digits to avoid discrete selection errors. 
6
