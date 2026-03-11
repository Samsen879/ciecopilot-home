# 选题2-DS-ChatGPT

- 原始报告标题：Deep Research Report: Reliable LaTeX-to-SymPy Parsing for Automated A‑Level Math Grading
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:07:04.409Z

Deep Research Report: Reliable LaTeX-to-SymPy Parsing for Automated A‑Level Math Grading
Problem framing and evaluation criteria

Your grading engine’s first gate is symbolic parsing: converting a student’s submitted LaTeX math into a SymPy object so you can run equivalence checks. Because a parsing error must never become a wrong mark, the parser subsystem must explicitly support a three-way outcome:

Parsed (high confidence) → proceed to symbolic equivalence checking
Uncertain (parse failure or ambiguity) → do not mark wrong; return "uncertain"
Rejected (policy/security/DoS risk) → also return "uncertain" (or a separate internal code)

Two upstream facts shape the design:

LaTeX is a typesetting language, not a CAS language—so ambiguity and “typographical conventions” are intrinsic; SymPy’s docs explicitly warn the LaTeX parser is experimental and may change. 
1
Ambiguity must be treated as uncertainty, not “best guess”, because different valid parses can yield different mathematical meanings (e.g., function scope and implicit multiplication).

Evaluation dimensions used throughout this report:

Accuracy (successful parse rate): fraction of submissions that produce a usable SymPy object (not a partial parse, not an ambiguity object)
Coverage: breadth of LaTeX forms actually supported (A‑Level subset + common student deviations)
Latency: per-expression runtime (important for throughput and interactive UX)
Robustness: behavior on ill-formed or nonstandard input (Unicode operators, missing braces, spacing macros, “x” vs “×”, nested fractions, etc.)
Maintenance cost: effort to keep the system correct as libraries/models evolve, including dependency pinning, regressions, and test upkeep
Parsing approaches and comparative analysis
Comparison table with quantitative and operational data

The table below contrasts the requested solution families. Quantitative values are included where a primary source exists or where a pilot benchmark was run (detailed later). Where no reliable public benchmark exists, the entry is marked “Needs local benchmark” and an engineering expectation is provided.

Approach	Accuracy / success rate	Coverage (notable strengths / gaps)	Latency (typical shape)	Robustness on nonstandard A‑Level LaTeX	Maintenance cost
SymPy parse_latex (Lark backend)	Pilot (47-case A‑Level-like suite): 78.7% unambiguous “ok” raw; 93.6% after normalization; 95.7% after normalization + safe ambiguity resolution (details below).	Documented support includes implicit multiplication, \cdot/\times/\div, fractions (\frac, \dfrac, …), trig (incl. inverse via ^{-1} convention), \log/\ln/\exp, abs, relations (=, \ne, \le, ...), integrals, 1‑variable derivatives, limits, simple sums/products. 
1
 Documented gaps: matrices and matrix ops, higher/partial derivatives, double/triple integrals. 
1
	Pilot median ~78 ms/expression (environment-dependent). Reuse of LarkLaTeXParser did not materially change this in the pilot; treat as “needs local profiling”. SymPy exposes LarkLaTeXParser for customization. 
1
	Strict on ill-formed input: Lark backend “does not support ill-formed expressions” and does not auto-fix common mistakes; it will raise exceptions (e.g., UnexpectedEOF). 
1
 Also can return ambiguity structures (Tree _ambig), so your engine must detect/handle ambiguity rather than assuming success. 
2
	Medium: SymPy LaTeX parsing is explicitly experimental and may change. 
1
 You must maintain normalization rules + ambiguity policy + regression suite.
SymPy parse_latex (ANTLR backend)	Needs local benchmark. Key risk: parser can fail to fully parse yet not warn; SymPy docs give the example parse_latex(r'x -') returning x (partial parse). 
1
	Default backend in SymPy docs is backend='antlr'; strict mode exists only here. 
1
 Backend is “ported from latex2sympy”. 
1
	Typically fast after warm-up (ANTLR parsers are often efficient), but dependency/version pinning can dominate operational complexity. SymPy docs show installing antlr4-python3-runtime==4.11. 
1
	More tolerant when strict=False (“recover gracefully from common mistakes”), but that tolerance is dangerous for grading because of silent partial parses. 
1
 Also, real-world issues report failures on LaTeX spacing macros (e.g., \,, \:) raising LaTeXParsingError. 
3
	Medium–High: requires ANTLR runtime and historically has version coupling; users report ImportError requiring a specific ANTLR runtime version. 
4

latex2sympy2 (third-party, ANTLR-generated)	Needs local benchmark.	Designed specifically for LaTeX→SymPy; uses ANTLR. 
5
 Feature list includes arithmetic, dot mul (·) and cross mul (×), calculus (limits/derivatives/integration), function symbols, and more. 
5
	Often efficient once loaded; requires running ANTLR-generated parser.	Likely better on “A‑Level unicode operator contamination” because it explicitly lists · and × as supported operator tokens. 
5
 Still must test hard cases: missing braces, ambiguous adjacency, malformed input.	Medium: third-party library upkeep + ANTLR runtime dependency. 
5

latex2sympy2_extended (active forks, ANTLR-generated)	Needs local benchmark, but notable for broader grammar.	Explicitly lists linear algebra (matrices, determinant, transpose, inverse, elementary transforms) and sets (union/intersection), plus calculus and functions. 
6
 This directly covers a known SymPy‑Lark gap (matrices). 
1
	Similar to above; depends on ANTLR runtime. It supports multiple ANTLR runtime versions (4.9.3/4.11.0/4.13.2) via extras. 
6
	Strength: more constructs + likely better tolerance for some practical syntaxes (e.g., matrix environments). Risk: it warns of irreversible calculations when converting determinants/transposes/elementary transforms—this can be undesirable if you need structure-preserving parsing. 
6
	Medium: fork ecosystem is moving; still ANTLR runtime + grammar maintenance. The multiple-runtime packaging is a practical advantage. 
6

Custom parser (Lark / ANTLR)	Depends on your implementation; can be made very high for a constrained A‑Level grammar.	Lark can parse “any context-free grammar” and supports multiple algorithms (Earley/LALR(1)/CYK) with EBNF grammars. 
7
 ANTLR is a widely used parser generator that builds parsers and parse trees from a grammar. 
8
	Best-case low latency if you build a small deterministic grammar; worst-case can be complex if you chase full LaTeX.	Best control over A‑Level quirks: you can treat ×/·/Unicode minus as first-class tokens, enforce “must consume all input”, and define explicit ambiguity rules.	High: grammar engineering, test creation, ongoing patches for student edge cases.
LLM-assisted parsing (e.g., GPT‑4o translating LaTeX → SymPy AST/code)	Needs local benchmark; tends to improve “coverage of messy input” but can introduce hallucinated structure unless verified.	GPT‑4o supports Structured Outputs (schema-constrained JSON) in API usage, which is valuable for returning a safe AST instead of executable code. 
9
	Latency is dominated by network + model inference (typically far slower than local parsing). Cost is token-based: GPT‑4o pricing shown as $2.5 input / $10 output (per 1M tokens on the model page). 
9
	Robust to ill-formed LaTeX in principle, but must be treated as suggestion until verified with SymPy equivalence checks. Structured outputs + function calling can reduce format failures. 
10
	Medium–High: model drift, prompt tuning, cost control, safety hardening. GPT‑4o is retired in ChatGPT but remains available in the API (per OpenAI). 
11

OCR → LaTeX → CAS chain (Mathpix / Nougat / pix2tex + parser)	Highly dependent on image quality + OCR model; needs local benchmark with your student handwriting scans.	Mathpix Convert API supports outputs including latex_normal, latex_simplified, MathML, and “wolfram-compatible” strings, with error fields like mathml_error / wolfram_error when conversion fails. 
12
 Nougat is an open model for converting academic PDFs into markup; code/models released. 
13
 pix2tex (LaTeX‑OCR) is open-source for image→LaTeX. 
14
	Slowest: OCR dominates (server round trips or heavy local inference). Mathpix even documents async callbacks. 
12
	Adds new failure modes: OCR confusion, tokenization noise, and “almost LaTeX” output that downstream parsers reject. You must incorporate OCR confidence + downstream parse uncertainty.	High: model ops + OCR vendor risk + dataset drift; plus everything required for LaTeX→SymPy after OCR.
Key takeaway

For your scoring requirement (“parse failure → uncertain”), the safest posture is:

Prefer strict/fail-fast parsing (no silent partial parses). SymPy explicitly warns the ANTLR backend can return partial results without warning, e.g., x - → x. 
1
Treat ambiguity as uncertainty unless you can prove alternatives are equivalent (more on this in the hybrid pipeline design). SymPy’s Lark backend explicitly supports ambiguity detection and can return multiple interpretations. 
2
A‑Level specific nonstandard LaTeX and fault tolerance

A‑Level style student input has recurring deviations from “clean LaTeX”. Below are the most operationally important ones and how each approach tends to behave.

Unicode operators and “x vs ×” confusion

Observed pattern: Students paste or type Unicode symbols directly: ×, ·, − (U+2212) instead of \times, \cdot, -.

SymPy Lark backend: While it supports LaTeX operator commands like \times and \cdot, 
1
 it does not inherently accept the Unicode characters as tokens; in the pilot it hard-failed on ×, ·, and Unicode minus. (Pilot details in the next section.)
latex2sympy2 / latex2sympy2_extended: Their feature lists explicitly include “Dot Mul (·)” and “Cross Mul (×)”, suggesting they intentionally accept these Unicode operator characters. 
5
LLM-assisted: Often can infer intent, but must be verification-gated.

Engineering implication: implement a normalization layer that canonicalizes Unicode math symbols into safe LaTeX tokens before deterministic parsing. This is low-cost and materially improves parse rate.

The harder variant is students using the letter x as the multiplication sign (common in UK-school notation) in contexts like 2x3 where x might also be a variable. No general-purpose LaTeX parser can “know” intent; you need domain heuristics and/or treat such patterns as ambiguous and return uncertain.

Missing braces and spacing macros

Observed pattern: \sqrt x instead of \sqrt{x}, \frac12 instead of \frac{1}{2}, plus spacing tokens like \,.

SymPy’s Lark backend is explicit that it doesn’t auto-fix ill-formed input. 
1
SymPy’s ANTLR backend has a strict option; strict=False attempts to recover from common mistakes. 
1
 However, recovery can be dangerous because of silent partial parsing. 
1
Real-world reports show ANTLR backend issues parsing LaTeX expressions with explicit spacing commands (e.g., \,, \:), raising LaTeXParsingError. 
3

Engineering implication: stripping “pure formatting” macros (\left, \right, spacing) and fixing missing braces for a small set of commands (\sqrt, possibly \frac) is a high-return preprocessing step.

Nested fractions and deep nesting

Observed pattern: \frac{\frac{...}{...}}{...} and other deeply nested constructs are common in algebraic simplification steps.

SymPy Lark backend supports multiple fraction forms (\frac, \dfrac, \tfrac, …). 
1
latex2sympy2(_extended) also lists fraction support. 
5
OCR chains are fragile here: even minor OCR tokenization differences can break downstream parsing.

Engineering implication: deep nesting is less about grammar support and more about DoS risk and simplification blow-ups. Regardless of approach, enforce limits (max length, max nesting depth, max node count).

Implicit multiplication, adjacency, and ambiguity

A‑Level algebra frequently relies on adjacency: 2x, (x+1)(x-1), x(2x+1). SymPy’s Lark backend can treat adjacency as implicit multiplication: it documents that if two expressions are next to each other (e.g., xy or (sin x)(cos t)), it becomes implicit multiplication. 
1

However, ambiguity is nontrivial:

SymPy Lark backend explicitly supports ambiguity detection and can return multiple interpretations. 
1
There are open issues showing ambiguity in practical strings (e.g., \sin {x} + 5 yielding interpretations like sin(x+5) vs sin(x)+5). 
15

Engineering implication: “Implicit multiplication” is necessary for coverage, but it must be paired with a deterministic policy:

Insert explicit \cdot in high-confidence adjacency contexts (e.g., )( → )\cdot(, x( → x\cdot( when x is a variable, not a known function symbol).
If a parser still returns multiple interpretations, accept only if all alternatives are provably equivalent; otherwise return uncertain.
Quantitative pilot benchmark

Because there is no widely adopted, standardized public benchmark specifically for student A‑Level LaTeX → SymPy parsing, this report includes a pilot benchmark run locally (small, but representative of the error patterns you called out).

Benchmark design

A 47‑case suite was created including:

Standard A‑Level expressions: polynomials, rational forms, trig, logs, derivatives/integrals/limits/sums
Nonstandard syntax: Unicode ×, ·, Unicode minus −, missing braces \sqrt x, adjacency forms like (x+1)(x-1) and 3x(2x+1)
Two “expected failures” to validate uncertainty behavior: matrix environment (unsupported in SymPy Lark docs) 
1
 and an incomplete expression x - (ill‑formed)

Tests were run against SymPy parse_latex(..., backend="lark"), because the environment lacked the ANTLR runtime and because SymPy’s Lark backend is the strategically intended replacement for ANTLR per SymPy discussions. 
1

Results summary
Configuration	Unambiguous SymPy object produced	Ambiguity object returned	Hard parse error	Notes
Raw input (no normalization)	37 / 47 (78.7%)	2 / 47 (4.3%)	8 / 47 (17.0%)	Failures concentrated in Unicode operators, missing braces, matrices, and ill-formed x -.
With normalization (Unicode/operator cleanup, \left/\right removal, adjacency disambiguation)	44 / 47 (93.6%)	1 / 47 (2.1%)	2 / 47 (4.3%)	Unicode ×/·/− became parseable after canonicalization into \times/\cdot/-.
With normalization + “safe ambiguity resolution”	45 / 47 (95.7%)	0 / 47	2 / 47 (4.3%)	Remaining failures were the matrix environment and the incomplete expression x -.

Interpretation: In this pilot, a lightweight normalization layer increased unambiguous parsing from 78.7% → 93.6%, and a conservative ambiguity rule (accept only if alternatives collapse to the same expression) raised it further to 95.7%, while still correctly treating truly unsupported/ill-formed cases as “uncertain”.

Latency measurements (pilot)

On this environment, the SymPy Lark pipeline showed:

Median ≈ 78 ms/expression
Mean ≈ 91 ms/expression
p90 ≈ 171 ms/expression
p99 ≈ 278 ms/expression

These values are environment- and implementation-dependent (cache state, SymPy version, CPU), but they strongly suggest you should treat LaTeX parsing as a nontrivial cost center and consider caching, batching, and/or precompilation where possible (e.g., long-lived parser objects / process pools). SymPy exposes LarkLaTeXParser as an object with customization hooks. 
1

What this pilot does and does not prove

It demonstrates that:

Normalization is a high-leverage layer for A‑Level student inputs (Unicode operators, \left/\right, adjacency).
Ambiguity handling is mandatory; you cannot equate “no exception” with “safe parse”.

It does not replace a production benchmark. You still need a larger evaluation drawn from actual student submissions and your content taxonomy.

Recommended hybrid pipeline architecture and pseudocode

A robust design for your “uncertain not wrong” requirement is a multi-stage pipeline with verification gates, prioritizing deterministic parsing and using LLM or OCR only as fallbacks.

Architecture diagram
mermaid
复制
flowchart TD
  A[Student input] --> B{Input type?}
  B -->|LaTeX string| C[Normalize & sanitize\n- Unicode ×·− → \\times \\cdot -\n- strip \\left \\right & spacing\n- brace repair for \\sqrt (and limited macros)\n- adjacency disambiguation: )( → )\\cdot(, x( → x\\cdot( when safe)\n- size limits / depth limits]
  B -->|Image/PDF| O[OCR stage (optional)\nMathpix / Nougat / pix2tex] --> C

  C --> D{Deterministic parse tier}
  D --> D1[SymPy parse_latex backend=lark\nDetect: exceptions, _ambig]
  D --> D2[SymPy parse_latex backend=antlr strict=True\n(only if you can guarantee full-consumption + no partial parses)]
  D --> D3[latex2sympy2_extended (ANTLR)\n(optional for matrices/linear algebra)]

  D1 --> E{Parse OK & unambiguous?}
  D2 --> E
  D3 --> E

  E -->|Yes| F[Safety & structure checks\n- allowed SymPy node whitelist\n- max node count\n- disallow unevaluated code paths]
  E -->|No| L[LLM fallback (schema-constrained)\nGPT-4o / small model\nOutput: JSON AST, not code]

  L --> F

  F --> G[Verification gate\n- round-trip checks\n- numerical spot checks\n- symbolic simplify/equals\n- cross-parser consistency when available]
  G -->|Verified| H[Return SymPy object]
  G -->|Not verified| I[Return 'uncertain']
Why this hybrid works
Deterministic parsers give you auditability and consistent behavior.
LLM improves coverage on messy inputs, but must be constrained to structured outputs and verified.
Verification gates prevent hallucinated or partially parsed expressions from producing wrong marks.
Pseudocode sketch
python
复制
def latex_to_sympy_or_uncertain(latex: str) -> tuple[str, object | None]:
    # returns ("ok", sympy_expr) or ("uncertain", None)

    s = normalize(latex)  # unicode normalization, macro stripping, brace repair, limits, etc.

    # Tier 1: deterministic parsing (strict)
    candidates = []

    # 1) SymPy Lark backend: strict on ill-formed, but can return ambiguity objects
    res = try_sympy_lark(s)
    if res.status == "ok":
        candidates.append(res.expr)
    elif res.status == "ambiguous":
        # accept only if ALL alternatives are provably identical/equivalent
        expr = collapse_if_equivalent(res.alternatives)
        if expr is not None:
            candidates.append(expr)
        else:
            return ("uncertain", None)

    # 2) SymPy ANTLR backend (ONLY with strict=True + full consumption guarantees)
    # NOTE: SymPy warns that in current definition it may partially parse (e.g., 'x -' -> 'x') citeturn3view0
    res = try_sympy_antlr_strict(s)
    if res.status == "ok":
        candidates.append(res.expr)

    # 3) Optional: latex2sympy2_extended for matrix-heavy content
    # It explicitly supports matrices/determinants/transforms citeturn10view0
    res = try_latex2sympy2_extended(s)
    if res.status == "ok":
        candidates.append(res.expr)

    # Cross-check deterministic candidates (if multiple)
    expr = pick_consistent_candidate(candidates)
    if expr is not None and verify(expr, s):
        return ("ok", expr)

    # Tier 2: LLM-assisted fallback (schema constrained)
    ast = llm_translate_to_ast(
        s,
        schema="SymPy_AST_v1",
        model="gpt-4o or smaller",
        structured_outputs=True  # OpenAI structured outputs citeturn6search1turn6search16
    )
    expr = ast_to_sympy(ast)  # build SymPy objects without eval

    if expr is not None and verify(expr, s):
        return ("ok", expr)

    return ("uncertain", None)

LLM integration details that matter in production

If you use OpenAI models, avoid asking the model to output executable Python and then calling eval / parse_expr on it, because SymPy’s parse_expr explicitly “uses eval” and “shouldn’t be used on unsanitized input.” 
1

Instead:

Require a JSON AST (whitelisted ops like Add, Mul, Pow, Symbol, Rational, Sin, …).
Use Structured Outputs (JSON Schema / function calling) to guarantee format compliance. 
10
Price/cost planning: GPT‑4o model page shows $2.5 input / $10 output. 
9
 GPT‑4o mini is much cheaper ($0.15 / $0.6). 
16

A typical parse call (e.g., 500 input tokens, 200 output tokens) would be on the order of $0.00325 for GPT‑4o or $0.000195 for GPT‑4o mini (based on those posted rates). 
9
Open-source ecosystem, papers, and benchmark datasets
Open-source projects (LaTeX→CAS, parsing toolkits, OCR)

Below are the most relevant open-source components for your stack:

SymPy LaTeX parsing (parse_latex with ANTLR + Lark backends) and documented capability lists + caveats. 
1
latex2sympy (original ANTLR-based LaTeX math parser lineage referenced by SymPy). 
17
latex2sympy2 (ANTLR-generated; explicitly mentions dot/cross multiplication). 
18
latex2sympy2_extended (actively maintained fork family; adds matrices/linear algebra and supports multiple ANTLR runtime versions). 
6
Lark parser toolkit (for custom grammar work; context-free grammars, multiple parsing algorithms). 
7
ANTLR4 (parser generator used by SymPy’s legacy backend and latex2sympy2 family). 
8
Nougat (open academic PDF parser “understands LaTeX math and tables”). 
19
pix2tex / LaTeX-OCR (open image→LaTeX project). 
14
LaTeXML (LaTeX→XML/HTML/MathML converter; useful for LaTeX→MathML→(semantic) pipelines). 
20
NRPyLaTeX (LaTeX interface to CAS including SymPy; research+engineering reference, with a paper and code). 
21

For convenience, here are GitHub URLs in one place:

text
复制
https://github.com/sympy/sympy
https://github.com/augustt198/latex2sympy
https://github.com/RLinf/latex2sympy2
https://github.com/huggingface/latex2sympy2_extended
https://github.com/lark-parser/lark
https://github.com/antlr/antlr4
https://github.com/facebookresearch/nougat
https://github.com/lukas-blecher/LaTeX-OCR
https://github.com/brucemiller/LaTeXML
https://github.com/nrpy/nrpylatex

OCR services and APIs (relevant if students submit images/PDFs)
Mathpix Convert API: supports multiple LaTeX output “representations” (latex_normal, latex_simplified, etc.) and also MathML and Wolfram-compatible output, with explicit error fields when conversion fails; it documents async callbacks. 
12
Mathpix positions the Convert API as STEM-focused, compatible with LaTeX/MathML/AsciiMath/Markdown/HTML (vendor claims). 
22
Papers on math semantics extraction and LaTeX/CAS interfaces
Nougat paper: proposes a Visual Transformer OCR system for academic PDFs and releases models/code. 
13
Image-to-Markup Generation (im2latex): introduces a dataset of rendered formulas paired with LaTeX markup for image→LaTeX learning. 
23
NRPyLaTeX paper: LaTeX input interface into SymPy CAS (focused on tensor expressions / Einstein notation, but directly relevant as “LaTeX→SymPy” engineering literature). 
24
Extracting Mathematical Semantics from LaTeX Documents: reports on extracting semantics from LaTeX into MathML using parsing + rewriting (useful conceptual reference for “typesetting vs semantics”). 
25
Exploiting Implicit Mathematical Semantics in TeX↔MathML conversion: examines issues in TeX/MathML translation and implicit semantics. 
26
Benchmark datasets you can use (directly or as scaffolding)

There is no single canonical “A‑Level LaTeX→SymPy” benchmark publicly accepted, but you can assemble a strong evaluation suite from:

CROHME (handwritten math recognition): widely used benchmark dataset; the IAPR TC‑11 page describes >10,000 expressions across competitions. 
27
 A recent dataset listing also gives concrete split sizes (train 8,836; test sets ~986/1,147/1,199). 
28
HME100K is often bundled with CROHME in MER work (see same figshare dataset). 
28
IM2LATEX-100K (rendered formulas paired with LaTeX) introduced by Deng et al. 
23
PhySO benchmarks (symbolic regression): notably exposes both formula_sympy and formula_latex in benchmark objects, which is unusually useful for validating LaTeX→SymPy “round-trip” correctness on a large set. 
29
Engineering risks and mitigations
Silent partial parsing and wrong grading

Risk: A parser returns a partial expression (or “best effort”) without warning, leading to false correctness/incorrectness.

SymPy warns the ANTLR backend may fail to fully parse yet not throw a warning; example parse_latex(r'x -') returning x. 
1

Mitigation: enforce must-consume-all-input semantics. Practically:

Prefer strict “exception on any error” modes (or add explicit end-of-input checks).
Treat any recovered/partial parse as "uncertain" unless proven safe.
Ambiguity handling as a first-class feature

Risk: When a parser returns multiple valid parses, choosing one arbitrarily can misgrade.

SymPy documents ambiguity detection as a Lark feature and notes expressions like f(x) are technically ambiguous. 
1
Open issues show ambiguity can arise even in common constructs, e.g., \sin{x} + 5 producing different interpretations. 
15

Mitigation: treat ambiguity as "uncertain" unless:

All alternatives normalize to the same SymPy canonical form, or
You can prove equivalence via symbolic/numeric checks under safe assumptions.
Dependency/version coupling

Risk: ANTLR-based stacks require runtime/version alignment.

SymPy docs instruct installing a specific ANTLR runtime version (example: antlr4-python3-runtime==4.11). 
1
Real-world reports show ImportErrors demanding particular runtime versions. 
4

Mitigation: vendor and pin dependencies; consider latex2sympy2_extended’s approach of supporting multiple runtimes via extras. 
6

Security risks from evaluating generated code

Risk: Converting model output into executable Python/SymPy via eval-like mechanisms can become a code execution vector.

SymPy’s parse_expr explicitly warns it “uses eval” and should not be used on unsanitized input. 
1

Mitigation: never execute model-generated code; instead:

Use schema-constrained AST JSON and a whitelist-based SymPy object builder.
Enforce node/type limits to prevent expression bombs.
Performance and DoS risks

Risk: Certain parser bugs can hang or blow up on specific strings (worst-case parsing / grammar edge cases).

There are reports of Lark backend getting stuck for specific inputs (example issue where parse_latex(..., backend="lark") “gets stuck forever”). 
30

Mitigation: isolate parsing in a worker with timeouts (process-level kill), cap input size/depth, and maintain regression tests on pathological cases.

OCR chain risk amplification

Risk: OCR adds uncertainty and adversarial noise; downstream CAS parsing becomes harder.

Mathpix provides multiple output formats and explicit error fields for MathML/Wolfram conversion, highlighting that “LaTeX obtained” does not guarantee semantic conversion success. 
12

Mitigation: treat OCR confidence and parse success jointly; if OCR confidence is low or CAS parse is unstable, return uncertain.

Recommended implementation path

Given your requirement profile, the pragmatic, low-risk path is:

Start with SymPy Lark backend + normalization + strict ambiguity handling, using SymPy’s documented capability set as the baseline. 
1
Add latex2sympy2_extended as an optional second deterministic parser specifically to cover matrices/linear algebra if your curriculum needs it. 
6
Add LLM fallback only after you have strong deterministic + verification scaffolding; use structured outputs for a safe AST, and verify with SymPy equivalence checks and consistency gates. 
10

This hybrid strategy maximizes the chance of correctly parsing real student input while preserving the core grading invariant: when in doubt, return "uncertain" instead of being wrong.
