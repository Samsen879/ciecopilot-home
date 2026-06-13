# Smart Mark Phase 1B Readiness Gate

Issue: #446
Parent: #435
Depends on: #445
Date: 2026-06-14
Baseline inspected: `origin/main @ 461904607077ff83a0e4bce5cc0fcb40929a6792`
Scope: docs/eval/spec readiness gate only. No scoring implementation, schema change, API change, frontend route change, or content-pipeline change.

## Verdict

This document defines the Phase 1B released-scoring entry gate for Smart Mark. It is not a scoring release approval.

The current repo already validates the Phase 1A released-family posture for exactly these `9709` question types:

- `9709.trigonometry.identities`
- `9709.trigonometry.equations`
- `9709.integration.application`
- `9709.differential_equations.separable`

Those types may enter a future Phase 1B released-scoring candidate only if the additional scoring-quality gates below pass. All other subjects, families, question types, whole-paper scopes, and production-ready content surfaces remain `non_released_fallback`.

## Source Map

| Source | Current use |
| --- | --- |
| `docs/reports/2026-06-14-phase-1a-live-source-of-truth-contract-readback.md` | #436 source-of-truth: scoring release scope requires promoted question type, released rubric ref, and validated uncertainty behavior; fallback is a valid product posture. |
| `api/learning/lib/contracts/released-scope.js` and `api/learning/lib/contracts/released-scope-core.js` | Runtime `released_scope_check` posture, allowed-output flags, fallback reason codes, low-confidence behavior, and uncertainty fail-closed behavior. |
| `api/learning/lib/contracts/released-family-gate.js` | Current released-family evidence evaluator for gold set, released rubric coverage, and uncertainty validation. |
| `data/learning_runtime/release_evidence/released-family-gate-contract.v1.json` | Checked-in gate contract for the four promoted `9709` question types. |
| `data/learning_runtime/release_evidence/released-family-gate-receipt.v1.json` | Checked-in passing receipt for released-family evidence. |
| `data/learning_runtime/pilot_rubrics/*.json` | Released pilot rubric templates for the four promoted question types. |
| `api/marking/lib/decision-engine-v1.js` and `api/marking/lib/marking-result-contract.js` | Existing marking decision and result-shaping behavior that future Phase 1B scoring evals must validate before release. |
| `api/learning/__tests__/released-scope.test.js` | Current regression coverage for released/fallback posture and promoted question-type boundaries. |

## Released Scope

| Candidate slice | Candidate question types | Current released-family evidence | Phase 1B scoring entry status |
| --- | --- | --- | --- |
| Trigonometric manipulation/equations released runtime slice | `9709.trigonometry.identities`, `9709.trigonometry.equations` | Pass: gold set 4 samples, average confidence 0.93, released rubric coverage, uncertainty pass/fail-closed cases. | Eligible only after the Phase 1B scoring-quality gate passes. |
| Integration applications only | `9709.integration.application` | Pass: gold set 3 samples, average confidence 0.91, released rubric coverage, uncertainty pass/fail-closed cases. | Eligible only after the Phase 1B scoring-quality gate passes. Broader `9709.integration.*` stays fallback. |
| Separable differential equations only | `9709.differential_equations.separable` | Pass: gold set 4 samples, average confidence 0.915, released rubric coverage, uncertainty pass/fail-closed cases. | Eligible only after the Phase 1B scoring-quality gate passes. Broader `9709.differential_equations.*` stays fallback. |

The Phase 1B gate must not treat `9709` paper production readiness, OCR/read-model/RAG readiness, or family/type classifier readiness as scoring release evidence. Those surfaces can support retrieval and workspace context, but they do not prove point-award correctness.

## Entry Conditions

A future Smart Mark Phase 1B released-scoring PR may claim released scoring for one of the candidate question types only when all of these conditions are true for that exact question type and rubric version.

| Gate | Requirement | Blocking fallback |
| --- | --- | --- |
| Released rubric coverage | The rubric template is versioned, `release_state: "released"`, tied to the exact `question_type_id`, cites mark-scheme provenance, covers every released point and subpart in scope, and preserves dependency/follow-through semantics. | Missing, draft, mismatched, or incomplete rubric coverage forces `non_released_fallback`. |
| Scoring gold set | A scoring gold set exists for the exact question type and rubric version. It must include correct, partially correct, incorrect, ambiguous, and near-miss attempts, not only classifier samples. | Missing or classifier-only gold evidence forces `non_released_fallback`. |
| Uncertainty behavior | Every low-confidence, ambiguous parse, multiple-branch, missing-binding, dependency-error, or manual-review-required path fails closed to fallback or manual review before any formal point judgement. | Unvalidated uncertainty posture forces `non_released_fallback`. |
| False award checks | Hard-negative and near-miss attempts must not receive marks for unmet rubric points. Any critical false award blocks release. | Critical false award blocks released scoring for the question type/rubric version. |
| False denial checks | Gold-correct and follow-through-valid attempts must receive the marks they are entitled to, including allowed equivalent forms. Any unexplained false denial blocks release until fixed or explicitly downgraded to fallback. | Unexplained false denial blocks released scoring for the question type/rubric version. |
| Regression gates | Existing released-scope, import, review-task, mastery, marking-result, decision-engine, and closed-loop tests must pass with the new scoring eval fixture set. | Any failing required regression keeps the type in fallback. |
| Subpart consistency | Point results must map to the requested part/subpart, totals must reconcile with rubric `score_max`, dependencies must not leak across unrelated subparts, and ambiguous part mapping must suppress authoritative scoring. | Ambiguous or cross-subpart mapping forces fallback or manual review. |
| Runtime posture | `released_scope_check.allowed_outputs.authoritative_score`, `formal_point_judgement`, and `strong_positive_type_level_mastery` may be true only after all gates pass. | Any missing gate keeps all three allowed outputs false. |

## Gold Set Requirements

The existing released-family receipt validates minimum classifier/rubric/uncertainty evidence. Phase 1B released scoring additionally requires a scoring gold set for each released question type:

- At least one fixture per official rubric point and dependency/follow-through branch in the released template.
- At least one full-award, partial-award, zero-award, hard-negative, and borderline/ambiguous attempt per question type.
- At least one false-award trap per point family where a learner shows a plausible but invalid transformation, domain enumeration, integration step, or separable-form step.
- At least one false-denial trap per point family where the learner uses a valid alternate form, equivalent simplification, or allowed follow-through path.
- For multi-part questions, at least one fixture with multiple subparts proving that point decisions and totals do not leak across subparts.
- Every fixture must name `question_type_id`, rubric version, expected per-point decisions, expected total/subpart totals, uncertainty expectation, source question/attempt refs, and whether authoritative scoring is allowed.

Classifier confidence samples in `released-family-gate-contract.v1.json` are not sufficient by themselves for this Phase 1B gate. They remain necessary release-scope evidence, but scoring release needs per-point expected-decision evidence.

## False Award And False Denial Checks

False award and false denial checks are release blockers because they directly affect learner trust and mastery promotion.

| Check | Definition | Required behavior |
| --- | --- | --- |
| False award | A rubric point is awarded even though the expected gold decision is not awarded. | No critical false awards are allowed in released scoring. If an adapter is uncertain, it must suppress the point judgement instead of awarding. |
| False denial | A rubric point is denied even though the expected gold decision is awarded. | No unexplained false denials are allowed. Allowed alternate forms and follow-through paths must be represented in rubric/eval evidence before release. |
| Silent ambiguity | The engine makes a formal judgement while an uncertainty trigger should have fired. | Must fail closed to fallback or manual review. |
| Cross-subpart award | A point from one subpart contributes to another subpart total. | Must fail the subpart consistency gate. |

The first Phase 1B eval report should publish counts by question type, rubric point, part/subpart, expected decision, actual decision, and uncertainty posture. If a future team wants rate-based thresholds instead of zero critical blockers, that must be a separate human-approved policy change.

## Regression Gates

Before any future PR can claim released Smart Mark scoring for this scope, it must run and record a focused bundle covering:

- released scope posture: `api/learning/__tests__/released-scope.test.js`
- import boundary posture: `api/learning/__tests__/question-import-service.test.js`
- mastery guardrails: `api/learning/__tests__/mastery-orchestrator.test.js`
- review-task/effect behavior from marking results: `api/learning/__tests__/review-task-service.test.js`
- marking decisions and result shape: `api/marking/__tests__/decision-engine-v1.test.js`, `api/marking/__tests__/decision-engine-v1-ft-cao.test.js`, and `api/marking/__tests__/marking-result-contract.test.js`
- released-family receipt regeneration or validation for the exact changed rubric/eval artifacts
- a new Phase 1B scoring-quality eval that covers the gold-set, false-award, false-denial, uncertainty, and subpart-consistency requirements in this report

If a rubric template, scoring adapter, uncertainty policy, released-scope helper, `MarkingResult` shape, ReviewTask trigger policy, or mastery posture changes, the whole focused bundle must be rerun. A passing production-ready content gate for 9709/9231/9702 is not a substitute for this scoring bundle.

## Subpart Consistency

Released scoring must preserve part/subpart boundaries:

- Every rubric point result must carry a stable `part_id` and, where applicable, `subpart_id`.
- Part/subpart totals must reconcile with the released rubric template `score_max`.
- Dependency chains may cross points only when the released rubric template explicitly says so.
- Follow-through must cite its source point IDs and must not convert an invalid source step into an unrelated award.
- Ambiguous `part_id`/`subpart_id` mapping must set authoritative scoring to false and surface fallback or manual-review posture.
- ReviewTask, Artifact, and mastery effects derived from marking results must carry the same part/subpart evidence instead of re-infering it downstream.

## Non-Released Fallback

These scopes remain `non_released_fallback` after this child:

- whole-paper deterministic marking for any subject or paper;
- all `9702` and `9231` scoring, even when content surfaces are production-ready;
- all `9709` types outside the four promoted question types listed above;
- broader `9709.integration.*` beyond `9709.integration.application`;
- broader `9709.differential_equations.*` beyond `9709.differential_equations.separable`;
- imported/pasted questions whose classifier, rubric, confidence, uncertainty, or source evidence does not match a released question-type/rubric path;
- any question with missing released rubric ref, draft rubric ref, low classification confidence, unvalidated uncertainty posture, ambiguous part mapping, unresolved visual/image context, or stale/mismatched rubric version.

Fallback is a successful runtime posture. It may provide explanation, hints, workspace artifacts, review prompts, and conservative learning signals, but it must not emit authoritative scores, formal point judgements, or strong positive type-level mastery.

## Acceptance Coverage

| Issue requirement | Coverage in this report |
| --- | --- |
| Trigonometric manipulation/equations released runtime slice | Covered in Released Scope, Entry Conditions, and Gold Set Requirements for `9709.trigonometry.identities` and `9709.trigonometry.equations`. |
| `9709.integration.application` only | Covered as the sole integration candidate and broader integration fallback. |
| `9709.differential_equations.separable` only | Covered as the sole differential-equations candidate and broader differential-equations fallback. |
| Released rubric coverage | Entry Conditions and Source Map define and validate current released template coverage. |
| Gold set requirements | Dedicated scoring gold-set requirements distinguish classifier gold evidence from Phase 1B per-point scoring evidence. |
| Uncertainty behavior | Entry Conditions, False Award/False Denial Checks, and Non-Released Fallback define fail-closed behavior. |
| False award / false denial checks | Dedicated blocker definitions and required eval reporting. |
| Regression gates | Dedicated required focused bundle and rerun triggers. |
| Subpart consistency expectations | Dedicated consistency rules. |
| What remains `non_released_fallback` | Dedicated fallback section. |

## Implementation Boundary

This child does not implement new scoring and does not change runtime behavior. A future implementation child must still provide the scoring-quality eval fixtures and verification evidence before enabling any new released scoring path.
