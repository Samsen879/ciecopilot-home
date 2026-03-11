# 选题4-DS-ChatGPT

- 原始报告标题：Formalizing CIE Follow Through Marking for Cambridge Mathematics: Rules, State Machines, Verification, and Implementation
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:07:14.683Z

Formalizing CIE Follow Through Marking for Cambridge Mathematics: Rules, State Machines, Verification, and Implementation
Authoritative Cambridge rules for FT, Strict FT, and CAO

Cambridge International mark schemes (including CIE A/AS Mathematics 9709) embed Generic Marking Principles plus Mathematics-Specific Marking Principles and “Mark Scheme Notes” that define the mark types (M/A/B, dependencies) and the abbreviations (FT, CAO, etc.) used to control follow-through awarding. 
1

Within Cambridge International A Level Mathematics mark scheme notes:

M (Method) marks are awarded for a valid method applied to the problem, and they are not usually lost for numerical errors, algebraic slips, or unit errors. 
1
A (Accuracy) marks are awarded for a correct answer/intermediate step and cannot be awarded unless the associated M mark is earned (or implied). 
1
B marks are for a correct result/statement independent of method marks. 
1
DM/DB indicates an M or B mark is dependent on an earlier asterisked mark; if that prerequisite is not achieved, the dependent mark cannot be awarded. 
1

These foundational rules matter because Cambridge’s FT logic is primarily about when to relax “correct work only” restrictions for A/B marks (and sometimes for downstream A/B marks that rely on earlier results), while M marks already tolerate many “wrong-number” situations provided the method is valid. 
1

Follow Through in Cambridge’s own wording

For Cambridge International A Level Mathematics mark schemes, FT is defined as follows (paraphrased precisely): an indicated A or B mark may be awarded for work that is correct following on from previously incorrect results; otherwise, A/B marks are for correct work only. 
1

Cambridge International also defines CAO (Correct Answer Only) in the abbreviations list as emphasizing that no follow-through from a previous error is allowed. 
1

For Strict FT, Cambridge’s published specimen marking instructions (Cambridge IGCSE Mathematics specimen materials) explicitly distinguish standard FT from Strict FT: Strict FT requires you to follow through from the candidate’s error, and these are indicated in the mark scheme. 
2

What triggers FT, and what blocks it, in a Cambridge-style marking logic

Because Cambridge’s own definition ties FT to “marks indicated” in the scheme, FT is not a global policy; it is a per-mark permission that must appear in the mark scheme (often as “A1FT”, “B1FT”, or as guidance like “FT … their …”). This is visible in 9709/31 where specific marks are labeled B1FT and the guidance explicitly references “their” earlier value. 
1

In operational terms consistent with Cambridge’s published rules:

FT is triggered when (i) the target mark is labeled FT (or the mark scheme says FT applies), and (ii) the candidate’s later step is logically/mathematically correct given their earlier incorrect result (what examiners often call “carry forward” or “follow-on” correctness), and (iii) any required prerequisites (e.g., the needed M mark for an A mark) are satisfied. 
1
FT is blocked when (i) the mark is CAO (explicitly blocking follow-through), or (ii) the mark is not indicated FT and thus the default “A/B marks for correct work only” applies, or (iii) a required dependency mark (DM/DB or “A depends on M”) was not achieved, or (iv) other scheme constraints such as “WWW” (Without Wrong Working) apply, which can require the absence of wrong working even if an answer is correct. 
1

A particularly important Cambridge nuance for implementing FT robustly is that follow-through interacts with accuracy/rounding policies: Cambridge’s specimen guidance notes that if an earlier part earned an accuracy mark but then was rounded incorrectly (and that rounding was condoned), a later incorrect answer produced from that wrongly rounded value should not be treated as an FT case for the later accuracy mark. 
2

How “FT marks” coexist with normal marks

In Cambridge notation, FT does not create extra marks; instead, it changes the acceptance condition of a mark already in the scheme (“the A or B mark indicated is allowed…”). 
1

This means a single A1 (or B1) mark is awarded at most once, but it can be earned either by:

matching the correct expected value/statement, or
(if FT is indicated and allowed) matching the shadow expected value/statement computed by correctly following from earlier incorrect results. 
1

Strict FT tightens that coexistence: if Strict FT applies, the marking should be aligned to the candidate’s erroneous branch rather than allowing “recovery to the correct branch” to earn the mark when strict follow-through is required. 
2

Formal specification of an FT-capable scoring semantics

This section defines a machine-checkable specification (suitable for implementation + model checking) that is faithful to Cambridge’s published FT/CAO intent while supporting your engineering constraint that ft_mode defaults to 'none'.

Core entities

Let a question be structured as a directed acyclic dependency graph of mark items:

MarkItem (node) represents one mark in the scheme, with fields:
id: MarkId
kind ∈ {M, A, B} (Cambridge mark types) 
1
max = 1 (Cambridge mark schemes use whole marks; each mark item is awarded or not) 
1
prereq_marks ⊆ MarkId (covers A→M dependency and DM/DB dependency) 
1
requires_correct_only: Bool (true if CAO at that mark) 
1
ft_tag ∈ {none, ft, strict_ft} (scheme annotation; strict_ft corresponds to Strict FT) 
2
ft_basis ⊆ Symbol ∪ MarkId (optional; identifies the “their …” sources when the scheme explicitly restricts FT to particular upstream values, as seen in 9709/31 guidance text for FT marks) 
1
predicate(env) -> Bool the correctness condition for that mark under environment env (e.g., “candidate’s r equals 5/2”, or “candidate stated θ = 5π/6”).

We also define two environments (the “two worlds” idea):

env_correct: a mapping of symbols to the mathematically correct values/expressions.
env_shadow: a mapping where certain symbols are replaced by the candidate’s erroneous values, and all downstream expected results are recomputed from those erroneous values.

This “shadow-world” idea is exactly what Cambridge’s FT definition requires: later work may be credited if it follows correctly from earlier incorrect results. 
1

Global FT override modes

Your project constraint introduces a global override variable:

ft_mode ∈ {'none', 'strict', 'cao'}, with default 'none'.

Interpretation (designed to be both implementable and compatible with Cambridge’s per-mark annotations):

ft_mode='none': obey the mark scheme’s local tags (ft_tag and requires_correct_only).
ft_mode='strict': treat every ft_tag='ft' as strict follow-through behavior (a conservative “must follow through” override), while still honoring CAO. This is aligned with Cambridge’s notion that Strict FT can be enforced when indicated. 
2
ft_mode='cao': treat all A/B marks as Correct Answer Only, i.e., block follow-through globally (stronger than local CAO). This matches the Cambridge meaning of CAO as “no follow through from a previous error.” 
1
Normative awarding rule for a single MarkItem

Given a mark item m, candidate work W, and previously awarded marks Awarded ⊆ MarkId, define:

prereq_ok(m) ≜ prereq_marks(m) ⊆ Awarded
UpstreamError(m) ≜ there exists some symbol/mark in ft_basis(m) (or in the dependency cone of m if ft_basis omitted) where env_shadow differs from env_correct.

Then the award function is:

Method marks (M):
Award(m)=1 iff prereq_ok(m) holds and the method predicate is satisfied. A key Cambridge property is that method marks are not usually lost for numerical errors/algebra slips, so in practice your “method predicate” should be structural (pattern-based), not purely value-based. 
1

Accuracy / independent marks (A/B):

Let CAO_effective(m) ≜ (ft_mode='cao') ∨ requires_correct_only(m).

Let FT_effective(m) ≜ ¬CAO_effective(m) ∧ (ft_tag(m)∈{ft, strict_ft}).

Let Strict_effective(m) ≜ (ft_tag(m)=strict_ft) ∨ (ft_mode='strict' ∧ ft_tag(m)=ft).

Then:

If ¬prereq_ok(m) then Award(m)=0.
Else if CAO_effective(m) then Award(m)=1 iff predicate(env_correct) holds.
Else if ¬FT_effective(m) then Award(m)=1 iff predicate(env_correct) holds. (This corresponds to Cambridge’s default: A/B marks are for correct work only unless FT is allowed.) 
1
Else if FT_effective(m):
If ¬UpstreamError(m) then Award(m)=1 iff predicate(env_correct) holds.
If UpstreamError(m) and Strict_effective(m) then Award(m)=1 iff predicate(env_shadow) holds. (Strict FT: must follow through.) 
2
If UpstreamError(m) and ¬Strict_effective(m) then Award(m)=1 iff predicate(env_correct) ∨ predicate(env_shadow) holds. (Standard FT: accept correct or shadow-correct.)

This formalizes exactly the Cambridge statement that FT allows A/B marks for work correctly following from earlier incorrect results, and that CAO prohibits follow-through. 
1

Key safety invariants implied by the spec

These are the invariants you typically want the model checker to prove:

Boundedness: each mark item is awarded at most 1, and total score ≤ total marks in scheme (whole marks, no duplication). 
1
CAO blocks FT: in ft_mode='cao' (or for CAO-marked items), no A/B mark can be awarded solely by satisfying predicate(env_shadow) when predicate(env_correct) is false. 
1
Dependency gating: if prerequisites aren’t met (A depends on M; DM/DB), the dependent mark must be 0 regardless of later correctness. 
1
Strictness monotonicity: global strict mode is never more lenient than scheme-respecting mode: Score(ft_mode='strict') ≤ Score(ft_mode='none') for the same candidate trace (this is a conservative property, not a Cambridge requirement but desirable in your system).
Two formal models: FSM statechart and Petri net

The specification above can be represented in multiple formal models. Below are two complementary models (FSM/statechart and Petri net) that make different aspects explicit: control flow vs. dependency/token flow.

FSM and Statechart model of FT evaluation

Statecharts extend ordinary FSMs with hierarchy and concurrency, which is useful because FT evaluation naturally maintains “extended state” (environments, dependency status) while iterating marks. 
3

Below is an extended FSM for marking a single question part with FT support. It focuses on when the engine is allowed to consult shadow expectations.

mermaid
复制
stateDiagram-v2
  [*] --> Init

  Init --> EvalNextMark: load MarkItem(i)

  state "EvalNextMark\n(extended state:\n- env_correct\n- env_shadow\n- Awarded\n- ft_mode)" as EvalNextMark

  EvalNextMark --> CheckPrereq: i < N
  EvalNextMark --> Done: i == N

  CheckPrereq --> BlockedByPrereq: !prereq_ok(i)
  CheckPrereq --> DecidePolicy: prereq_ok(i)

  BlockedByPrereq --> CommitZero: Award(i)=0
  CommitZero --> Advance

  DecidePolicy --> CAOOnly: CAO_effective(i)
  DecidePolicy --> NoFT: !CAO_effective(i) && !FT_effective(i)
  DecidePolicy --> FTAllowed: FT_effective(i)

  CAOOnly --> CheckCorrect: predicate(env_correct)
  NoFT --> CheckCorrect

  FTAllowed --> CheckUpstreamError: detect UpstreamError(i)

  CheckUpstreamError --> CheckCorrect: !UpstreamError(i)
  CheckUpstreamError --> StrictShadowOnly: UpstreamError(i) && Strict_effective(i)
  CheckUpstreamError --> EitherCorrectOrShadow: UpstreamError(i) && !Strict_effective(i)

  StrictShadowOnly --> CheckShadow: predicate(env_shadow)
  EitherCorrectOrShadow --> CheckCorrect: predicate(env_correct)
  EitherCorrectOrShadow --> CheckShadow: predicate(env_shadow)

  CheckCorrect --> CommitOne: true
  CheckCorrect --> CommitZero: false

  CheckShadow --> CommitOne: true
  CheckShadow --> CommitZero: false

  CommitOne --> Advance
  Advance --> EvalNextMark: i := i+1

  Done --> [*]

How this reflects Cambridge rules:

“A marks cannot be given unless the associated M mark is earned” becomes prereq_ok. 
1
“FT implies that the A or B mark indicated is allowed for work correctly following on from previously incorrect results” becomes FTAllowed → ... CheckShadow. 
1
“CAO … no follow through from a previous error is allowed” becomes the CAOOnly branch. 
1
“Strict FT … must follow through from their error” becomes the StrictShadowOnly branch. 
2
Petri net model of FT gating and dependency flow

Petri nets model token flow across places/transitions and are often used for concurrent/distributed systems, but they are also excellent for representing resource/permission flow (“shadow-permission token exists”) and dependency enabling (“prerequisites have tokens”). 
4

We model each MarkItem i with places that represent whether prerequisite marks are satisfied and whether shadow-follow-through is enabled.

Places (P):

P_i_ready — MarkItem i is next to evaluate.
P_i_prereq_ok — prerequisites met (tokens from prerequisite places).
P_i_cao — CAO effective at i.
P_i_ft — FT effective at i.
P_i_strict — Strict effective at i.
P_i_upErr — upstream error exists for this mark.
P_i_correctSat — predicate satisfied in env_correct.
P_i_shadowSat — predicate satisfied in env_shadow.
P_i_awarded — mark i awarded.
P_i_zero — mark i not awarded.

Transitions (T):

T_checkPrereq_i: consumes P_i_ready, produces either P_i_prereq_ok or directly P_i_zero.
T_evalPolicy_i: from P_i_prereq_ok, routes token to P_i_cao vs P_i_ft vs “noFT”.
T_evalCorrect_i: when P_i_cao or noFT (or FT with no upstream error), checks correctness token P_i_correctSat.
T_evalShadow_i: when P_i_ft ∧ P_i_upErr, checks P_i_shadowSat (and under strict also requires P_i_strict).
T_award_i / T_zero_i: commit award.

Intuition: FT is represented as a token-enabled alternative firing path that is disabled by CAO tokens.

This Petri-net view is especially nice for generating tests: any firing sequence that reaches P_i_awarded via T_evalShadow_i corresponds to an “FT-awarded” scenario; any path blocked by P_i_cao corresponds to CAO blocking follow-through, consistent with Cambridge’s published meaning of CAO. 
1

Model checking with SPIN, NuSMV, and TLA+ plus verification results
Feasibility: mapping the FT semantics to model checking

This problem is well-suited to model checking because the core logic is finite-state once you abstract “math correctness” into Boolean propositions such as correctSat and shadowSat, and represent dependencies as finite graphs.

SPIN verifies models expressed in Promela, and properties expressed as LTL (Linear Temporal Logic). 
5
NuSMV is a symbolic model checker for finite-state systems; it supports checking specifications in CTL and LTL. 
6
TLA+ is a specification language for concurrent/reactive systems; TLC is the primary model checker used to explore finite-state instances of TLA+ specs and check invariants/temporal properties. 
7
Key properties to verify

Using your examples, the most relevant formally stated properties are:

No double counting / bounded score: score never exceeds the scheme maximum; no mark item can be awarded twice.
CAO blocks FT completely: in CAO mode (global override) and/or for CAO marks, shadow-satisfaction cannot award marks.
Dependency chain correctness: if a prerequisite mark is missing, dependent marks cannot be awarded (even if their predicates are true).
Strict FT behavior: when strict FT is effective and an upstream error exists, the mark can only be awarded via shadow-satisfaction (not via correct-branch satisfaction in “recovery” cases).

These directly correspond to Cambridge’s definitions of FT and CAO and dependency marks. 
1

Example encodings of properties

SPIN/LTL sketch:
Let award[i], correctSat[i], shadowSat[i], caoEff[i] be Boolean variables.

CAO blocks FT:
[] (caoEff[i] -> (award[i] -> correctSat[i]))

NuSMV sketch (INVAR / LTLSPEC):

INVAR caoEff_i -> (award_i -> correctSat_i)
INVAR !prereqOk_i -> !award_i

NuSMV’s manuals and tutorials explicitly position the tool to check LTL/CTL properties over FSM transition relations. 
8

TLA+/TLC sketch:
A TLA+ model would define variables (i, Awarded, ft_mode, correctSat, shadowSat, prereqOk, ...) and a Next action that advances i while updating Awarded. TLC is designed to check invariants over finite models. 
9

Verification results from an explicit-state exploration

To provide concrete evidence (beyond “it’s checkable”), I implemented a bounded explicit-state exploration of the abstract semantics (finite-state model where each mark has Boolean satisfaction for correct/shadow predicates, optional upstream error, and dependencies).

For a representative 4-mark fragment (M1, A1 depends on M1, A2 is FT-capable and depends on M1, plus an independent B3), I exhaustively explored:

all combinations of per-mark satisfactions (correctSat, shadowSat)
all combinations of upstreamError flags
all ft_mode ∈ {none, strict, cao}

This produced 12,288 distinct abstract executions, and no counterexamples were found for:

“FT marks do not exceed normal bounds” (no double-awarding; total ≤ max)
“CAO blocks FT completely” (no award on shadow-only satisfaction under CAO)
“dependency chain break forces dependent marks to 0”
“strict mode is never more lenient than none mode” (a conservative engineering property)

These results are limited to the abstracted Boolean model, but they validate the control logic you intend to implement; the remaining risk is in the correctness of the math predicates and dependency extraction rather than in the FT/CAO gating itself.

Shadow computation with SymPy: branching “shadow evaluation” and data structures

Cambridge FT requires that later expected values be computed “following on” from earlier incorrect results. 
1

In an automated system, this maps naturally to “shadow evaluation”: maintain a second environment where erroneous candidate values are treated as bindings, then recompute downstream expectations using substitution.

Practical SymPy building blocks
subs() performs symbolic substitution and can accept multiple substitutions at once; SymPy expressions are immutable, so this produces a new expression rather than mutating in-place. 
10
.evalf() (or N()) performs numerical evaluation with configurable precision. 
11
sympify() converts inputs into SymPy objects; when parsing non-Python math syntax such as 2x+1, SymPy recommends using parse_expr with transformations. 
12
Data structures

A robust FT engine needs to represent both marking and dependency:

text
复制
MarkGraph:
  nodes: Map[MarkId, MarkItem]
  edges_value: Map[MarkId, Set[Symbol]]      # which symbols this mark/function consumes
  edges_prereq: Map[MarkId, Set[MarkId]]     # DM/DB or A->M prereqs

MarkItem:
  id: MarkId
  kind: {'M','A','B'}
  prereq_marks: Set[MarkId]
  cao: Bool
  ft_tag: {'none','ft','strict_ft'}
  ft_basis: Optional[Set[Symbol or MarkId]]  # supports "FT ... their ..."
  expected_expr: SymPyExpr or predicate closure
  candidate_expr_ref: pointer to parsed candidate expression(s)

ShadowContext:
  env_correct: Map[Symbol, SymPyExpr]
  env_shadow:  Map[Symbol, SymPyExpr]
  origin: Map[Symbol, {'correct','candidate_error','condoned_rounding',...}]
  divergence_frontier: Set[Symbol]           # symbols where env_shadow != env_correct
  ft_mode: {'none','strict','cao'}           # default 'none'


The origin and divergence_frontier fields are important to reproduce Cambridge’s nuanced behavior around accuracy/rounding follow-through limits. 
2

Shadow evaluation algorithm (pseudocode)

Below is a design that explicitly supports FT, Strict FT, and CAO (ft_mode override), and can be extended for MR/PA/nfww/www flags.

pseudo
复制
function mark_question(markGraph, candidateSteps, ft_mode='none'):
    ctx = ShadowContext(ft_mode=ft_mode)
    Awarded = {}   # MarkId -> 0/1

    # 1) Build env_correct from the mark scheme's canonical working
    #    or from a reference solution model (symbolic).
    ctx.env_correct = build_reference_environment(markGraph)

    # 2) Parse candidate steps into SymPy expressions / assertions.
    parsed = parse_candidate(candidateSteps)  # uses sympify/parse_expr

    # 3) Iterate marks in a topological order respecting prereqs.
    for m in topo_order(markGraph):

        if not prereq_ok(m, Awarded):
            Awarded[m.id] = 0
            continue

        # Determine effective CAO / FT policy
        cao_eff = (ctx.ft_mode == 'cao') or m.cao
        ft_eff  = (not cao_eff) and (m.ft_tag in {'ft','strict_ft'})
        strict_eff = (m.ft_tag == 'strict_ft') or (ctx.ft_mode == 'strict' and m.ft_tag == 'ft')

        # Ensure env_shadow is initialized: start equal to env_correct
        if ctx.env_shadow is empty:
            ctx.env_shadow = ctx.env_correct.copy()

        # Evaluate "correct world" predicate
        ok_correct = evaluate_predicate(m, parsed, ctx.env_correct)

        if cao_eff or (not ft_eff):
            Awarded[m.id] = 1 if ok_correct else 0
            continue

        # FT is effective; compute whether upstream error exists for this mark
        basis = m.ft_basis if m.ft_basis else dependency_cone_symbols(m, markGraph)
        upErr = exists s in basis: ctx.env_shadow[s] != ctx.env_correct[s]

        if not upErr:
            Awarded[m.id] = 1 if ok_correct else 0
            continue

        # Shadow world predicate
        ok_shadow = evaluate_predicate(m, parsed, ctx.env_shadow)

        if strict_eff:
            Awarded[m.id] = 1 if ok_shadow else 0
        else:
            Awarded[m.id] = 1 if (ok_correct or ok_shadow) else 0

        # If this mark corresponds to a candidate-computed symbol, detect divergence and branch
        # (This is where "shadow computation" is created/updated.)
        update_shadow_context_if_candidate_defines_symbol(ctx, m, parsed)

    return Awarded


function update_shadow_context_if_candidate_defines_symbol(ctx, m, parsed):
    # Example: the mark item corresponds to candidate defining a variable v = expr
    if not defines_symbol(m): return

    v = m.defined_symbol
    cand_expr = parsed.get_definition(v)  # SymPyExpr from candidate

    correct_expr = ctx.env_correct[v]
    if equivalent(cand_expr, correct_expr):
        ctx.env_shadow[v] = correct_expr
        ctx.origin[v] = 'correct'
    else:
        ctx.env_shadow[v] = cand_expr              # anchor the candidate error
        ctx.origin[v] = 'candidate_error'
        ctx.divergence_frontier.add(v)

    # Recompute downstream shadow expectations lazily (preferred) or eagerly:
    # Lazy: nothing else here; evaluate_predicate substitutes as needed using env_shadow


Implementation notes tied to SymPy:

equivalent(a,b) should use symbolic normalization (e.g., simplify a-b) when possible, and fall back to numeric sampling with high-precision .evalf() when needed. SymPy supports both symbolic substitution (subs) and numerical evaluation (evalf). 
10
parse_candidate() should prefer parse_expr for input-like math strings (e.g., implicit multiplication), per SymPy’s own parsing guidance. 
13

This architecture implements the FT requirement directly: if a candidate value is wrong at some definition point, later marks that are FT-eligible can be checked against expressions recomputed under that wrong value binding (shadow world), following Cambridge’s definition. 
1

Test-case generation from the formal spec with boundary-focused suites

A formal semantics enables systematic test generation in two complementary ways:

Trace enumeration from the model (FSM/Petri net): generate paths that hit each guard (CAO branch, FT with upstream error, strict-only shadow, missing prereq, etc.). Petri nets are especially good at generating firing sequences that correspond to these boundary situations. 
4
Constraint-based generation (Alloy): encode the dependency graph + award rules as relations, then ask the Alloy Analyzer for instances/counterexamples under bounded scopes; Alloy is explicitly designed for automated finite-scope exploration of software design models. 
14
Auto-generated boundary test set

Below is a self-contained test suite (machine-readable JSON) for a minimal mark graph designed to exercise your requested edge cases: “two-step error FT”, “CAO in middle”, and “B mark independent”.

Mark scheme fragment:

M1: method mark for computing y
A1: accuracy mark for correct y, prereq M1
A2: accuracy mark for computing z from y, marked FT (or later overridden by global strict mode), prereq M1
A3: accuracy mark for computing w from z, marked CAO, prereq M1
B4: independent statement mark (no prereq)

Candidate behavior is abstracted by two booleans per mark predicate:

correctSat: predicate satisfied under env_correct
shadowSat: predicate satisfied under env_shadow
json
复制
[
  {
    "name": "baseline_all_correct",
    "ft_mode": "none",
    "observations": {
      "M1": {"correctSat": true,  "shadowSat": true},
      "A1": {"correctSat": true,  "shadowSat": true},
      "A2": {"correctSat": true,  "shadowSat": true, "upstreamError": false},
      "A3": {"correctSat": true,  "shadowSat": true},
      "B4": {"correctSat": true,  "shadowSat": true}
    },
    "expected_awards": {"M1": 1, "A1": 1, "A2": 1, "A3": 1, "B4": 1}
  },
  {
    "name": "single_early_error_then_follow_through_correctly",
    "ft_mode": "none",
    "observations": {
      "M1": {"correctSat": true,  "shadowSat": true},
      "A1": {"correctSat": false, "shadowSat": true},
      "A2": {"correctSat": false, "shadowSat": true, "upstreamError": true},
      "A3": {"correctSat": false, "shadowSat": true},
      "B4": {"correctSat": true,  "shadowSat": true}
    },
    "expected_awards": {
      "M1": 1,
      "A1": 0,
      "A2": 1,
      "A3": 0,
      "B4": 1
    },
    "rationale": "A2 is FT-enabled so shadow correctness can earn it; A3 is CAO so shadow cannot earn it."
  },
  {
    "name": "two_consecutive_errors_break_follow_through_chain",
    "ft_mode": "none",
    "observations": {
      "M1": {"correctSat": true,  "shadowSat": true},
      "A1": {"correctSat": false, "shadowSat": true},
      "A2": {"correctSat": false, "shadowSat": false, "upstreamError": true},
      "A3": {"correctSat": false, "shadowSat": false},
      "B4": {"correctSat": true,  "shadowSat": true}
    },
    "expected_awards": {"M1": 1, "A1": 0, "A2": 0, "A3": 0, "B4": 1},
    "rationale": "Even with FT, A2 requires correct follow-through from the wrong value; a second error makes shadow predicate fail."
  },
  {
    "name": "recovery_case_standard_ft_allows_correct_branch",
    "ft_mode": "none",
    "observations": {
      "M1": {"correctSat": true,  "shadowSat": true},
      "A1": {"correctSat": false, "shadowSat": true},
      "A2": {"correctSat": true,  "shadowSat": false, "upstreamError": true},
      "A3": {"correctSat": true,  "shadowSat": false},
      "B4": {"correctSat": true,  "shadowSat": true}
    },
    "expected_awards": {"M1": 1, "A1": 0, "A2": 1, "A3": 1, "B4": 1},
    "rationale": "Standard FT accepts either correct or shadow-correct at FT marks; here the candidate 'recovers' to the correct value at A2."
  },
  {
    "name": "recovery_case_strict_mode_blocks_correct_branch",
    "ft_mode": "strict",
    "observations": {
      "M1": {"correctSat": true,  "shadowSat": true},
      "A1": {"correctSat": false, "shadowSat": true},
      "A2": {"correctSat": true,  "shadowSat": false, "upstreamError": true},
      "A3": {"correctSat": true,  "shadowSat": false},
      "B4": {"correctSat": true,  "shadowSat": true}
    },
    "expected_awards": {"M1": 1, "A1": 0, "A2": 0, "A3": 1, "B4": 1},
    "rationale": "Global strict treats FT marks as Strict FT: when upstream error exists, only shadow correctness earns A2."
  },
  {
    "name": "global_cao_blocks_all_follow_through",
    "ft_mode": "cao",
    "observations": {
      "M1": {"correctSat": true,  "shadowSat": true},
      "A1": {"correctSat": false, "shadowSat": true},
      "A2": {"correctSat": false, "shadowSat": true, "upstreamError": true},
      "A3": {"correctSat": false, "shadowSat": true},
      "B4": {"correctSat": true,  "shadowSat": true}
    },
    "expected_awards": {"M1": 1, "A1": 0, "A2": 0, "A3": 0, "B4": 1},
    "rationale": "Global CAO override enforces Correct Answer Only everywhere: no shadow-only award is permitted."
  },
  {
    "name": "dependency_break_prevents_accuracy_mark",
    "ft_mode": "none",
    "observations": {
      "M1": {"correctSat": false, "shadowSat": false},
      "A1": {"correctSat": true,  "shadowSat": true},
      "A2": {"correctSat": true,  "shadowSat": true, "upstreamError": true},
      "A3": {"correctSat": true,  "shadowSat": true},
      "B4": {"correctSat": true,  "shadowSat": true}
    },
    "expected_awards": {"M1": 0, "A1": 0, "A2": 0, "A3": 0, "B4": 1},
    "rationale": "Accuracy marks cannot be awarded unless associated method mark is earned/implied; dependency gating forces A marks to zero."
  }
]


This suite directly targets your requested boundary conditions while remaining faithful to Cambridge’s published FT/CAO and A→M dependency logic. 
1
