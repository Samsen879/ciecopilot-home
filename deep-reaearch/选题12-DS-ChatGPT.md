# 选题12-DS-ChatGPT

- 原始报告标题：CIE-Copilot Synthetic Gold Set for Cambridge A Level Mathematics 9709
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:08:19.301Z

CIE-Copilot Synthetic Gold Set for Cambridge A Level Mathematics 9709

Designing a copyright-safe, machine-verifiable benchmark of ≥500 synthetic items with step rubrics, M/A/B dependencies, and follow-through logic

Scope constraints and Cambridge 9709 marking and accuracy conventions

Cambridge International AS & A Level Mathematics (9709) separates Pure Mathematics into multiple papers; for your Synthetic Gold Set (SGS) the relevant content sections are Pure Mathematics 1 (Paper 1) and Pure Mathematics 3 (Paper 3). The 2026–2027 syllabus content overview explicitly lists Paper 1 topics (Quadratics, Functions, Coordinate geometry, Circular measure, Trigonometry, Series, Differentiation, Integration) and Paper 3 topics (Algebra; Logarithmic & exponential functions; Trigonometry; Differentiation; Integration; Numerical solution of equations; Vectors; Differential equations; Complex numbers). 
1

Your rubric model (M/A/B + dependencies + FT) is well aligned with Cambridge’s own mark-scheme conventions. The official 9709 Paper 3 specimen mark scheme notes define the mark types as: M (method, valid method applied to the problem; still awardable with algebra/numerical slips), A (accuracy, only after the relevant method mark), and B (a correct statement/step). The same notes explain DM/DB dependency marking, and the abbreviations AG, CAO, FT, etc. 
2
 These statements justify your core invariant: A-marks should not be awarded unless their prerequisite M-mark(s) are met, which you are implementing as rubric-DAG dependencies. 
2

For numerical accuracy, Cambridge’s cover instructions commonly require non-exact answers to be given to 3 significant figures (and 1 decimal place for angles in degrees) unless otherwise stated. 
3
 The 9709 mark scheme notes reinforce this from the marking side: for a numerical answer, allow the A/B mark if the answer is correct to 3 s.f. (or would be correct if rounded), with the angle special case. 
2
 This is the strongest public anchor for auto-deriving accuracy_policy defaults in SGS rubrics.

Finally, syllabus bullet points matter for topic_path granularity. For example, Paper 1 integration includes reverse differentiation, definite integrals (including simple “improper” cases), areas/volumes, and constants of integration. 
1
 Paper 3 integration explicitly includes (among others) integration by parts and partial fractions, which are important “method skeleton” discriminators for your rubric alignment. 
1

Skeleton extraction specification with a formal, machine-readable definition
Why “skeleton + parameters” is the right abstraction

In educational measurement, the dominant scalable paradigm is Automatic Item Generation (AIG): build an item model (structure + constraints + intended skill) and then instantiate many items via parameter sampling. Reviews of AIG commonly emphasize a pipeline with (at minimum) a cognitive model (target knowledge/skills) plus an item model (construction rules), sometimes adding a text/passage model for surface realization. 
4
 Your “topological skeleton” corresponds closely to the item model, while your “parameter space” corresponds to an AIG generator’s instantiation variables under constraints.

For mathematics specifically, you also need a second structure: not only the problem statement skeleton, but the solution/rubric topology skeleton (the DAG that your SLA aligns to). Practically, SGS should store both.

Formal definition

Define a Math Item Skeleton (S) as a tuple:

[ S = \langle \text{topic_path},\ \text{task},\ \mathcal{V},\ \mathcal{U},\ \Sigma,\ \mathcal{C},\ G,\ \Pi,\ R \rangle ]

where:

topic_path: hierarchical syllabus node(s) (e.g., P3/Integration/ByParts), anchored to official content sections. 
1
task: a typed goal (solve equation, evaluate definite integral, prove identity, find vector equation, etc.).
(\mathcal{V}): given symbols/objects (constants, functions, points, vectors).
(\mathcal{U}): unknown(s) to produce.
(\Sigma): a semantic specification (equations/relations defining the situation).
(\mathcal{C}): constraints over parameters (domains, positivity, non-degeneracy, uniqueness).
(G): machine-checkable goal predicate (e.g., “answer (A) satisfies (G(A)=\text{True})”).
(\Pi): a solution plan skeleton (method graph), i.e., an abstract DAG of transformation steps.
(R): a rubric skeleton derived from (\Pi), including M/A/B typing, dependency edges, and FT policy consistent with Cambridge mark-scheme rules. 
2

A parameterization is a mapping (\theta: \mathcal{P}\to \text{Values}) over a parameter set (\mathcal{P}\subseteq\mathcal{V}) such that all constraints (\mathcal{C}) hold. An item instance is (I = S[\theta]) (rendered statement + fully solved canonical solution + fully instantiated rubric).

Machine-readable skeleton language

A practical SGS format should be primarily JSON (for CI diffing) with embedded symbolic objects in a canonical form. SymPy represents expressions as expression trees, which makes it natural to store skeleton math as AST-like structures. 
5
 Concretely, store symbolic fields as:

sympy_srepr (stable, explicit structure), or
sympy_str with strict parsing rules, or
LaTeX plus a parsed SymPy shadow (recommended if students submit LaTeX; but parsing may be fragile, so treat LaTeX as display, SymPy as truth).

For parsing non-Python syntax into SymPy, SymPy’s docs recommend using parse_expr when sympify cannot parse the string. 
6

A minimal Skeleton JSON schema (illustrative) is:

json
复制
{
  "skeleton_id": "P3.INT.BYPARTS.poly_times_trig.v1",
  "topic_path": ["P3/Integration/ByParts"],
  "task": {"type": "definite_integral", "variable": "x"},
  "statement_template": "Evaluate $\\int_{0}^{a} x \\sin(bx)\\,dx$ where $a>0, b>0$.",
  "parameters": {
    "a": {"type": "rational_or_pi_multiple", "domain": "a>0", "constraints": ["a != 0"]},
    "b": {"type": "integer", "domain": "b>=1", "constraints": ["b <= 9"]}
  },
  "constraints": [
    "b*a not in {k*pi : k in Z}  // avoid trivial zeroing by symmetry",
    "solution_complexity within baseline_band"
  ],
  "semantic_spec": {
    "integrand": "x*sin(b*x)",
    "bounds": ["0", "a"]
  },
  "solution_plan": {
    "plan_type": "integration_by_parts",
    "nodes": [
      {"id": "M1_choose_u_dv", "op": "choose_parts", "u": "x", "dv": "sin(b*x) dx"},
      {"id": "M2_apply_ibp", "op": "apply_integration_by_parts", "depends_on": ["M1_choose_u_dv"]},
      {"id": "A1_simplify", "op": "simplify", "depends_on": ["M2_apply_ibp"]}
    ]
  },
  "rubric": {
    "nodes": [
      {
        "id": "M1",
        "logic_type": "M",
        "depends_on": [],
        "ft_mode": "allow_ft",
        "symbolic_rule": {"kind": "pattern", "expect": "u=x and dv=sin(b*x)dx"}
      },
      {
        "id": "A1",
        "logic_type": "A",
        "depends_on": ["M1"],
        "ft_mode": "allow_ft",
        "accuracy_policy": {"kind": "exact_or_equiv"}
      }
    ]
  }
}


This aligns with Cambridge’s dependency principle (“accuracy marks cannot be given unless the relevant method mark has also been given”) and with explicit CAO/FT tags. 
2

How to extract skeletons from authored questions

For SGS creation you will usually be generating from skeletons rather than extracting from copyrighted papers, but you still need a canonical extraction procedure so that: (a) designers can author new skeletons consistently, and (b) the pipeline can auto-classify topic_path and method plan.

A robust extraction workflow is:

Task typing: classify goal type (solve, integrate, differentiate, show identity, vector geometry, etc.). This can be done by detecting target verbs (“solve”, “evaluate”, “show”), math operators (∫, d/dx), and expected output form.
Semantic form capture: transform the statement into one of a small set of canonical semantic frames. Example frames:
definite_integral(integrand, var, lower, upper)
equation_solve(equation, var, domain)
vector_line(point, direction)
Math AST normalization: represent the integrand/equation in SymPy; store the expression tree for consistent matching and downstream variation. SymPy explicitly models expressions as trees, which is key for “topology” invariants like degree, function family, and operator depth. 
5
Parameter slotting: replace instance constants with typed parameter slots (integer, rational, surd, pi-multiple, etc.) and attach constraints (\mathcal{C}) to prevent degeneracy and to enforce uniqueness.
Method-plan assignment: attach a plan class (e.g., integration_by_parts, partial_fractions, trig_identity_simplify) using pattern rules anchored to syllabus methods (e.g., Paper 3 explicitly includes by-parts and partial fractions). 
1
Parameter variation library with difficulty-preservation and SymPy validation
Design principle: isomorphic structure, varied surface

Your goal (“no difficulty drift”) is essentially the isomorphic problem criterion: keep the underlying concept and solution structure fixed while varying numbers, representations, or story contexts. Recent work on scalable isomorphic problem generation describes isomorphic problems as testing identical concepts and solution structures while varying surface features/contexts, enabling richer variation than merely changing numbers. 
7
 This principle should be encoded directly in SGS as a “structure signature” per item instance (see below).

Variation strategy taxonomy

A useful SGS generator should implement variations in three layers, with progressively higher risk of difficulty drift:

Numeric variations (lowest risk)
Operate only on scalar constants while preserving the same operator tree and method plan.

Coefficient substitution: (ax^2+bx+c) with ((a,b,c)) sampled under discriminant/roots constraints.
Affine variable transforms: (x \mapsto kx+m) when the method remains unchanged (often safe for differentiation/integration tasks).
Bound variations for definite integrals ensuring non-triviality (avoid symmetric cancellation or zero-width intervals).

Functional-form variations (medium risk)
Swap function families only when the method skeleton is invariant.

In P3 integration, “polynomial × sin/cos/exp” is typically still by-parts (and SymPy explicitly notes it can integrate exponential–polynomial combinations, which often correspond to repeated by-parts). 
8
However, swapping to tan can change the primitive form and may alter the number/type of transformations (log identities, substitution), increasing drift risk. Therefore, implement function swaps with a method-consistency gate (below).

Contextual/story variations (highest risk)
Change narrative wrapper (geometry ↔ physics) while preserving the same semantic frame (\Sigma). This is powerful but can introduce hidden difficulty via language complexity. Use it primarily for differential equations / rates-of-change contexts that the syllabus expects without specialized contextual knowledge. 
1

Difficulty-preserving constraints as computable invariants

Because you don’t have student-response calibration for SGS, enforce “difficulty invariance” via structural proxies. Research on parameterized item generators suggests that parameter choices often do not significantly affect measured difficulty in many cases, but this is not guaranteed; you still need systematic controls. 
9

Implement a Structure Signature ( \sigma(I) ) that must remain constant across variants from the same skeleton:

task_type (solve/integrate/etc.)
method_plan (by_parts / partial_fractions / trig_identity)
Expression tree features: operator multiset, function-family multiset, maximum depth
Required subgoals count (e.g., “differentiate then solve derivative=0”)
Expected-answer type: exact symbolic vs numeric approximation

Then a Complexity Band ( \kappa(I) ) that may vary only slightly:

count_ops (operation count) on key intermediate expressions and final answer
size of simplified final expression (terms, factors)
number of solution branches (e.g., trig solutions in ([0,360^\circ)))

SymPy’s simplify documentation notes that the default complexity measure used internally is count_ops(), which counts operations in an expression. 
10
 This supports using count_ops as a first-pass difficulty proxy (not perfect, but automatable).

For a more principled proxy, you can train a feature-based difficulty predictor (expert-rated or small pilot-student sample) as described in recent work on feature-based difficulty prediction for math items. 
11
 Even if SGS itself is synthetic, such a model can help keep variants within the same predicted band.

SymPy-based solvability and drift gates

Use SymPy not only to “solve” but to reject bad parameters and detect method drift.

Solvability checks (hard gates)

integrate must produce a closed-form expression (reject if SymPy returns an unevaluated Integral or contains unresolved special functions outside syllabus scope). SymPy’s integrals documentation emphasizes broad coverage (including exp/sin/cos polynomial products). 
8
Equation solving should use SymPy’s solvers module (solveset, linsolve, nonlinsolve, etc.) depending on the class; SymPy docs recommend solveset() for univariate equations and specialized solvers for systems. 
12
Uniqueness: ensure the solution set is finite when the question expects a unique answer (or explicitly encode multiple solutions in the rubric).

Method-consistency checks (structure gates)

Run a skeleton-specific plan recognizer on the instantiated problem. Example: classify integrands into {reverse-diff, substitution-given, partial-fractions, by-parts} using shape rules aligned to syllabus bullets (e.g., Paper 3 explicitly includes by-parts and partial fractions). 
1
Reject any instance whose recognized plan differs from the skeleton’s plan.

Complexity-band checks (soft gates)

Compare count_ops for baseline vs variant at key nodes; accept only if within a tolerance band. 
10
Compare number of required transformations in the generated step plan (see rubric pipeline section).
SymPy auto-solving and rubric DAG generation aligned to M/A/B and FT
Core idea: generate steps from a plan, not from SymPy’s final answer

SymPy is excellent at computing results (integration/solving), but it does not natively output human-mark-scheme-style steps consistently. Therefore the SGS pipeline should treat SymPy as the semantic oracle, while the step sequence comes from a plan executor tied to the skeleton.

This separation mirrors AIG practice: the item model defines how items are constructed and validated, and additional validation layers ensure correctness and quality. 
4

Rubric node typing rules (logic_type) and dependency inference

Leverage Cambridge’s marking semantics:

M nodes correspond to steps that establish a valid method applied to the particular problem (setup transformations, selecting integration method, forming correct equations). Method marks remain awardable despite algebraic/numerical slips, consistent with Cambridge’s description. 
2
A nodes correspond to accurate intermediate steps or final answers that must depend on relevant method marks. Cambridge explicitly states accuracy marks cannot be awarded unless the relevant method mark has been awarded. 
2
B nodes correspond to correct statements/steps independent of method marks. 
2

Dependency rules:

Every A-node must have depends_on pointing to at least one M-node that justifies the method path (enforcing the “M0 A1 is not possible” principle). 
2
DM/DB dependencies arise when later M or B marks depend on earlier ones (Cambridge’s DM/DB notation means a particular M/B mark is dependent on an earlier starred mark). 
2
 In SGS, prefer explicit edges in the rubric DAG rather than star notation.

Follow-through policies:

Cambridge defines FT as “follow through after error” and CAO as “correct answer only (no follow through allowed).” 
2
In SGS, model this as a per-node ft_mode with at least: no_ft (CAO), ft_allowed (FT), and optional scoped FT modes (e.g., only algebraic follow-through, not method change).
Symbolic validation rules (symbolic_rule) that are robust in practice

Your Smart Mark Engine uses SymPy sandbox equivalence checks, which is appropriate, but equivalence is tricky:

SymPy’s simplify() applies many heuristics; the docs warn “simplest” is not well-defined and simplify may not yield the form you expect. 
13
SymPy’s .equals() (per SymPy maintainers) can return True/False/None; it typically tries simplification then randomized substitution tests and may be inconclusive. 
14

Therefore, your SGS symbolic_rule should be explicit about how to check a step. A practical rule taxonomy:

equiv_expr: student expression is algebraically equivalent to expected expression (use multi-pass simplification + numeric spot checks).
equiv_eq: student equation set equivalent to expected, possibly up to rearrangement.
derivative_check: for indefinite integrals, accept answers whose derivative equals integrand (handles constant of integration naturally).
substitution_check: for differential equations, substitute candidate into ODE and simplify to 0.
numeric_sf: numeric answers accepted if within rounding to 3 s.f. (or 1 dp for degree angles), per Cambridge policy. 
3

This rule library should be used both for (a) building SGS rubrics and (b) verifying student steps in production.

Auto-deriving accuracy_policy

Given Cambridge’s default convention, your SGS should default to:

numeric: accept answers correct to 3 significant figures (and angles in degrees to 1 decimal place) unless the question specifies otherwise. 
3
exact_or_equiv: for symbolic exact answers (e.g., involving (\pi), surds, logs), prefer equivalence checking without rounding.
specified: if the statement template includes “to (n) d.p.”, “to (n) s.f.”, or “exact”, override defaults.

Importantly, accuracy policy is not just about final answers: some SGS steps (e.g., iteration methods) may require intermediate rounding norms; Cambridge mark schemes sometimes demand iterations to a certain dp to justify a rounded final value (this appears in specimen marking guidance). 
2

End-to-end pipeline pseudocode

Below is a reference pipeline for SGS generation and rubric compilation. (Citations apply to the conceptual claims above, not the code.)

python
复制
def generate_sgs_item(skeleton: Skeleton, seed: int) -> ItemInstance:
    rng = Random(seed)

    # 1) Sample parameters under hard constraints
    for _ in range(MAX_TRIES):
        theta = sample_parameters(skeleton.parameters, rng)
        if not constraints_hold(skeleton.constraints, theta):
            continue

        # 2) Instantiate semantic spec (SymPy expressions)
        spec = instantiate_semantic_spec(skeleton.semantic_spec, theta)

        # 3) Solvability gate (SymPy oracle)
        solution = sympy_solve_task(skeleton.task, spec)
        if not solution.is_success:
            continue

        # 4) Uniqueness / multiplicity gate
        if skeleton.task.expects_unique and not solution.is_unique():
            continue

        # 5) Method-consistency gate (plan recognizer)
        inferred_plan = recognize_plan(skeleton.task, spec)
        if inferred_plan != skeleton.solution_plan.plan_type:
            continue

        # 6) Execute plan to produce canonical step DAG
        steps = execute_plan_steps(skeleton.solution_plan, spec, solution)

        # 7) Complexity band gate (anti difficulty drift)
        if not within_complexity_band(steps, skeleton.baseline_signature):
            continue

        # 8) Build rubric DAG (M/A/B typing + dependency)
        rubric = build_rubric_from_steps(steps, skeleton.marking_policy)

        # 9) Auto-fill symbolic_rule and accuracy_policy per node
        for node in rubric.nodes:
            node.symbolic_rule = compile_symbolic_rule(node, spec, solution)
            node.accuracy_policy = infer_accuracy_policy(node, skeleton.statement_template)

        # 10) Self-check: rubric nodes validate the canonical solution trace
        if not validate_rubric_against_solution(rubric, steps, solution):
            continue

        return ItemInstance(
            statement=render_statement(skeleton.statement_template, theta),
            parameters=theta,
            canonical_steps=steps,
            rubric=rubric,
            final_answer=solution.final_answer
        )

    raise GenerationError("Failed to generate valid item within MAX_TRIES")


Key implementation detail: sympy_solve_task should use SymPy modules appropriate to the task (integration, solvers, simplification), consistent with SymPy documentation. 
8

Coverage tracking for ≥500 items across P1/P3 topic_path nodes
Topic taxonomy and leaf-node definition

Start coverage from the syllabus content sections for Paper 1 and Paper 3. 
1
 Then expand each into leaf nodes based on the syllabus “Candidates should be able to…” bullets. Examples:

Paper 1 Integration leaf nodes include “evaluate definite integrals” and applications (area/volume), plus constants of integration. 
1
Paper 3 Integration leaf nodes include “integrate by parts” and “partial fractions” and “use a given substitution,” etc. 
1
Paper 3 Vectors includes 2D/3D vector notation and operations, equations of lines ( \mathbf{r}=\mathbf{a}+t\mathbf{b}), scalar products, etc. 
1

This gives an auditable mapping from topic_path to official syllabus skill statements.

Coverage metrics

Use at least three complementary metrics:

Node coverage ratio:
[ \text{coverage}(v)=\mathbf{1}[#\text{items tagged with }v \ge 1] ] and overall coverage = fraction of leaf nodes with ≥1 items.

Minimum-per-node quota: enforce (#\text{items}(v)\ge q_v). With ≥500 items, a naïve equal quota across 17 top-level nodes would be ~29 each, but leaf-node quotas should be weighted by (a) instructional importance and (b) diversity of method skeletons.

Structure diversity within node: within each leaf node (v), require at least (k) distinct structure signatures (\sigma(I)) (to prevent “500 near-duplicates”).

Automated gap detection and regeneration triggers

Implement a coverage controller:

Maintain a coverage_registry.json updated every CI run with counts per topic_path and per structure signature.
Define “red zones” (node count < quota, signature diversity < k, or all items in node fail a validation dimension like FT tests).
Trigger generation jobs targeted at missing nodes specifically, rather than re-running global generation.

This mirrors AIG best practice: item models define the space, and generation/validation pipelines fill gaps systematically. 
4

Quality validation SOP with automated gates, teacher sampling, and adversarial FT tests
Automated validation gates

A strong SGS should pass all of the following automatically before any teacher review:

SymPy solvability: the task solver succeeds (integration/solving). SymPy documentation supports broad symbolic integration and provides dedicated solving APIs. 
8
Solution uniqueness or explicit multiplicity: either unique answer, or rubric explicitly encodes multiple solutions and domains.
No degeneracy: reject items that collapse into trivial cases (e.g., integral becomes 0 for most students because of parameter cancellation).
Rubric self-consistency: canonical solution receives full marks under the rubric when replayed; incorrect canonical variants lose the intended marks.

For equivalence checks, do not rely on a single simplify call: SymPy warns that simplification is heuristic, and equality checks may be inconclusive. 
13

Teacher sampling SOP

Given the risk profile of fully automated generation (hallucinated contexts, uneven difficulty, incorrect or ambiguous rubrics), a human-in-the-loop layer is strongly supported by recent evaluations of AI-assisted exam variant generation, which highlight risks of factual errors, bias, and uneven difficulty and recommend HITL frameworks. 
15

A pragmatic teacher SOP for SGS auditing:

Sample at least 10–15% of items per leaf node initially; later move to risk-based sampling (more sampling for newly added skeletons or high-rejection nodes).
Review checklist focuses on:
Is the question unambiguous and solvable at the intended syllabus level?
Does the canonical solution reflect a legitimate Cambridge-style method?
Are M/A/B labels sensible and dependency edges correct (especially A depending on M)? 
2
Are FT/CAO decisions defensible (FT allowed only when method is correct “following through” an earlier numeric slip; CAO when absolute correctness is intended)? 
2
Does accuracy_policy match Cambridge norms (3 s.f. default; 1 dp degrees) or stated overrides? 
3
Adversarial testing: generate wrong answers to test scoring logic and FT

To validate your Smart Mark Engine (SLA alignment + symbolic verification + FT state machine), build an adversarial answer generator that produces plausible student errors as structured transformations of the canonical steps. This is analogous to how advanced math e-assessment systems analyze incorrect responses and classify error patterns; for example, research using STACK explores automatic classification of incorrect answers in differentiation contexts. 
16

Recommended error taxonomy (each should be auto-generated and unit-tested):

Sign/operation slips: (+ \leftrightarrow -), missing negative in integration by parts, dropped factor (b) in (\sin(bx)) differentiation.
Method-correct but arithmetic-wrong: ideal for FT. The scorer should still award M marks if the method is valid and applied, consistent with Cambridge’s method-mark philosophy. 
2
Premature rounding: student converts to decimals too early; ensure accuracy policy tolerances apply only where allowed (3 s.f. default). 
3
Jump steps / implied steps: student writes the correct final result with missing intermediate steps; your SLA should align to implied nodes where allowed by rubric design (Cambridge notes that when steps are run together, earlier marks may be implied). 
2
Wrong-method attempts: e.g., try substitution where by-parts is required; ensure M marks are not awarded incorrectly.

Each adversarial script should assert expected mark outcomes (total score and per-node outcomes), including FT propagation correctness when earlier numeric values are wrong but downstream algebra is consistent.

Research landscape and key references for AQG, AIG, and mathematical variation

Automated generation and assessment sit at the intersection of two research lines:

Automatic Question Generation (AQG)/Automatic Question-Answer generation: surveys summarize methods to generate questions and assess answers, typically from text or learning resources, emphasizing the role of AQG in scalable assessment. 
17
Automatic Item Generation (AIG) in educational measurement: modern reviews frame AIG around explicit models (cognitive model + item model + sometimes text model), systematic validation, and psychometric considerations. 
4

For your SGS specifically, the most relevant subtopics are:

Parameterized variation and difficulty stability: research analyzing hundreds of item generators reports that parameter choices often do not significantly affect difficulty, but the central premise remains: generators are most useful when difficulty is equivalent or predictable. 
9
Isomorphic problem generation: recent work formalizes generating problems that preserve solution structure while varying surface features and contexts—exactly your “topological skeleton + parameters” objective. 
7
AI-assisted exam variant generation with HITL: empirical studies emphasize that fully automated generation can introduce factual errors and uneven difficulty, motivating human-in-the-loop validation. 
15
Difficulty prediction from item features: feature-based ML approaches for math item difficulty provide a potential future path to more principled “difficulty invariance” beyond heuristics like operation counts. 
11

On the tooling side, your choice of SymPy as the symbolic oracle is consistent with SymPy’s documented strengths in integration (including exp/sin/cos polynomial products) and its solver ecosystem; but your SGS design correctly needs additional layers because simplification and equality checking can be heuristic or inconclusive. 
8
