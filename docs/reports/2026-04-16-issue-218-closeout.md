# 2026-04-16 Issue 218 Closeout

Date: 2026-04-16
Issue: `#218`
PR: `#219`
Branch: `feat/218`
Status: implementation shipped on branch and PR; issue-level closeout evidence recorded

## Shipped Scope

This issue hardened the existing structured question-search slice with the product-facing ranking and result-card contract for mixed paper-backed and imported results.

Shipped behavior:

- deterministic ordered ranking keys in product mode:
  - authority tier
  - structured exactness
  - release posture
  - type/family match strength
  - textual similarity
  - deterministic tiebreakers
- `paper_question` rows always outrank `imported_question` rows
- imported rows remain visible and always surface the `Imported / provisional` posture
- compact result-card payloads expose grounded title, meta line, and one-line summary data
- one-line result summaries come only from structured `summary` fields; unsupported summaries remain absent
- feature-flagged integration into the canonical `/api/learning/questions` flow and the learning runtime API client normalization
- shared question-search gate coverage extended with mixed-source ranking fixtures so the checked-in evidence exercises the same product-mode service

## Boundary Kept

This issue reused the earlier `#185`, `#186`, and `#187` infrastructure. It did not reopen:

- projection creation
- backend endpoint creation
- retrieval gate infrastructure
- descriptor backfill or data repair
- search-index redesign
- homepage or browse IA redesign
- open-ended RAG answer generation

## Feature Flag

Flag name: `QUESTION_SEARCH_PRODUCT_ENABLED`

Behavior:

- non-production runtime: enabled by default
- production runtime: enabled only when `QUESTION_SEARCH_PRODUCT_ENABLED=true`
- response payloads expose `feature_flags.question_search_product_enabled` so clients can tell whether the product contract is active

## Verification

Exact command run on this branch:

```bash
npm test -- --runInBand api/learning/__tests__/question-search-repository.test.js api/learning/__tests__/question-search-service.test.js api/learning/__tests__/question-search-api.test.js scripts/evaluation/__tests__/question-search-gate.test.js src/api/__tests__/learningRuntimeApi.test.js
```

Actual outcome:

- pass
- `5` suites passed
- `36` tests passed

Focused surfaces covered by the passing run:

- repository slice
- service ranking and grounded-card behavior
- `/api/learning/questions` API surface
- shared gate runner unit coverage
- learning runtime API client normalization

## Actual Outcome

Acceptance-critical outcome on this branch:

- mixed paper-backed and imported ranking is deterministic in product mode
- imported results remain visible but are always downgraded and badged as provisional
- result-card summaries do not synthesize unsupported claims; they are grounded or omitted
- focused mixed-source ranking and no-summary fallback coverage is in place

## Residual Risks And Follow-Up Debt

- production rollout still depends on explicitly enabling `QUESTION_SEARCH_PRODUCT_ENABLED`
- retrieval quality remains bounded by the completeness of existing paper metadata and structured descriptor fields; `#218` intentionally did not backfill or repair those data surfaces
- the issue does not change release readiness for unrelated search, browse, or answer-generation flows because those were explicitly out of scope
