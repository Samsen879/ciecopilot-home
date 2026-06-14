# Trust Pass 04 — Tests / Gates / Scripts Scan

Issue: [#464](https://github.com/Samsen879/ciecopilot-home/issues/464)
AO scope: Spark read-only review of tests, gates, and scripts surfaces.

## Executive signal
- Repository already shows a gate-heavy CI surface with clear separation between release, advisory, security, AO-control, and data integrity checks.
- The largest single quality gap is **test coverage scope drift**: Jest is configured to collect coverage only under `api/**/*.js`, while substantial runtime/tests live in `src/**` and `tests/**`.
- This scan is read-only and evidence-backed from live repository paths only.

## 1) GitHub workflow inventory (23 files)

### 1.1 Release-critical gates
- `.github/workflows/backend-consistency-gate.yml`
- `.github/workflows/db-contract-gate.yml`
- `.github/workflows/error-book-contract-gate.yml`
- `.github/workflows/marking-correctness-gate.yml`
- `.github/workflows/mark-engine-quality-gate.yml`
- `.github/workflows/phase1-e2e-gate.yml`
- `.github/workflows/recommendations-production-gate.yml`
- `.github/workflows/syllabus-boundary-tests.yml`
- `.github/workflows/shared-rate-limit-gate.yml`
- `.github/workflows/api-route-integration-gate.yml`
- `.github/workflows/a1-topic-link-gate.yml`
- `.github/workflows/b1-rubric-extraction-gate.yml`
- `.github/workflows/ao-operations-gate.yml`

**Notes:** these files present as top-level named gates and are tied to branch/Pull-request paths or scheduled/manual controls in their `name`/`on`/job definitions.

### 1.2 Advisory / benchmark gates
- `.github/workflows/rag-s1-1-benchmark.yml`
- `.github/workflows/rag-s1-2-benchmark.yml`
- `.github/workflows/rag-decision-benchmark.yml`
- `.github/workflows/rag-s2-advisory-gate.yml`

**Notes:** `rag-s2-advisory-gate` is marked advisory (`continue-on-error`) by design in file-level behavior.

### 1.3 Security
- `.github/workflows/security-baseline-gate.yml`
- `.github/workflows/security-depth-gate.yml`

### 1.4 Data/migration-related checks
- `.github/workflows/db-contract-gate.yml`
- `.github/workflows/syllabus-boundary-tests.yml`
- `.github/workflows/shared-rate-limit-gate.yml`

### 1.5 AO / control-plane checks
- `.github/workflows/ao-operations-gate.yml`
- `.github/workflows/rag-s1-contract-gate.yml`
- `.github/workflows/rag-s1-metric-gate.yml`

**Notes:** both `rag-s1-contract-gate.yml` and `rag-s1-metric-gate.yml` contain AO-only no-op branch logic (as noted in their job scripts/comments), so AO-only paths do not always execute the full validation logic.

### 1.6 Unclear/stale candidate gates
- `.github/workflows/rag-s2-advisory-gate.yml` (advisory by nature, but naming reads like a hard gate)
- `.github/workflows/rag-s1-contract-gate.yml` / `rag-s1-metric-gate.yml` (AO-no-op branches create ambiguity on whether checks are guaranteed in all PR scopes)
- `.github/workflows/rag-s1-1-benchmark.yml` and `.github/workflows/rag-s1-2-benchmark.yml` (sibling benchmark stages with similar intent, potential overlap without explicit stage boundary in reportable docs)

## 2) Package script inventory (package + workflow/test scripts)

### 2.1 `package.json` script families
- `test` command and unit test orchestration are present (Jest-driven test setup).
- API-facing test script family exists under `api:*` (e.g., `api:test` observed in scripts block).
- AO and workflow orchestration scripts exist under `ao:*` and `workflow:*` namespaces.
- Learning/syllabus-oriented test gates are defined through script families.
- Scripts reference `scripts/workflow/**` helpers for preflight and task launch behavior.

### 2.2 Workflow runner scripts taxonomy (`scripts/workflow/**`)
- Codex/AO helper and preflight scripts are present in `scripts/workflow/` and `scripts/workflow/lib/`, including guard/runner utilities and small command wrappers.
- These are intended to be invoked from workflow/CI scripts for preflight and branch-level gate orchestration.

### 2.3 Test command mapping (high-signal)
- `package.json` test entry points and helper script families map to:
  - repository-wide test execution,
  - API suite execution,
  - AO-oriented preflight checks,
  - workflow orchestration/runner commands.

## 3) Jest coverage posture

### 3.1 Coverage configuration (from repo config)
- `collectCoverageFrom` is limited to `api/**/*.js`.
- Tests are still discovered broadly via Jest matchers for `**/__tests__` and `**/?(*.)+(spec|test).js`.
- Exclusions remove node_modules and worktree internals.

### 3.2 Implications
- **Backend coverage signal is skewed toward API surface only.** Frontend/runtime test files outside `api/**/*.js` are discoverable by Jest but not included in coverage collection unless they also satisfy included paths.
- **Frontend/domain boundary blind spot:** existing `src/**` tests (`src/components/learning-runtime` etc.) can run but do not contribute to the configured coverage denominator.
- **Risk for release confidence:** combined with explicit release gates, there is a structural mismatch between “tests run” and “coverage measured.”

## 4) Test distribution by domain

### 4.1 Scope snapshot
- `api/**/__tests__/**` (and `api/**/*.js` API tests): **86** files total.
- `src/**/__tests__/**` (frontend/runtime): **29** files total.
- `api/learning`: **42** tests.
- `api/rag`: **22** tests.
- `api/marking`: **6** tests.
- `api/evidence`: **1** test.
- `api/_runtime`: **3** tests.
- `src/components/learning-runtime`: **14** tests.
- `tests/marking`: **1** test.
- `tests/evidence`: **2** tests.
- `tests/evidence-ledger`: **18** tests.
- `tests/ao`: **68** tests (largest auxiliary governance/AO surface in `tests/`).
- `scripts` test files: **103** files in script-level test helpers/specs.

### 4.2 Domain completeness map
- **Learning runtime**: covered by `api/learning` (backend) and `src/components/learning-runtime` (frontend).
- **Route registry / API contract**: covered by `api-route` and gateway-style contract gates plus `api` test corpus.
- **RAG**: substantial coverage in `api/rag` and dedicated RAG benchmark workflows.
- **Marking**: dedicated marking quality/correctness gates and API tests.
- **Evidence**: dedicated tests in `api/evidence` and `tests/evidence*` but comparatively sparse relative to AO controls.
- **AO**: large AO test footprint in `tests/ao` and AO-related workflow/script preflight entry points.
- **Scripts**: extensive `scripts` test files (103) suggest local helper correctness investment.

## 5) Gate duplication / naming-risk candidates
1. `rag-s1-contract-gate.yml` + `rag-s1-metric-gate.yml` include AO-only short-circuit behavior that can make it hard to tell in dashboards whether full validation ran.
2. `rag-s2-advisory-gate.yml` naming implies release gate but is advisory (`continue-on-error`).
3. `rag-s1-1-benchmark.yml` and `rag-s1-2-benchmark.yml` present adjacent benchmark gates with similar naming; failure provenance needs explicit differentiation in docs.
4. `a1-` / `b1-` gate naming is process-coupled and may be ambiguous for external reviewers without a legend.
5. AO naming (`ao-operations-gate`) and AO no-op workflow variants are easy to confuse with hard release gates unless execution-mode annotations are documented.

## 6) Reviewer command guide (first-pass)
Run in repository root:
1. `cat package.json`
2. `cat .github/workflows/*.yml`
3. `cat .github/workflows/{backend-consistency-gate,db-contract-gate,error-book-contract-gate,marking-correctness-gate,rag-s2-advisory-gate,security-baseline-gate,security-depth-gate,ao-operations-gate,rag-s1-contract-gate,rag-s1-metric-gate}.yml`
4. `cat scripts/workflow/*.js scripts/workflow/lib/*.js`
5. `cat docs/reports/INDEX.md`
6. `rg --files api/**/__tests__ src/**/__tests__ tests/**/`

## 7) P0 / P1 / P2 reviewer-impact findings

### P0
- **Coverage surface mismatch for release assurance**: only `api/**/*.js` is collected for coverage while large frontend and AO test surfaces exist outside that path; release confidence can be overstated if interpreted as full stack coverage.
  - Evidence: `package.json` Jest `collectCoverageFrom` and tests location mismatch (api-only coverage vs multi-folder test execution).

### P1
- **AO/benchmark gate interpretation ambiguity**: advisory and AO-only no-op branches are not consistently distinguished in naming/docs, which can mislead reviewer interpretation of pass/fail status.
  - Evidence: workflow files under `.github/workflows/` and AO-only logic within `rag-s1-contract-gate.yml` / `rag-s1-metric-gate.yml` and advisory `rag-s2-advisory-gate.yml`.

### P2
- **Documentation gap on gate taxonomy**: no single index entry currently explains which workflows are release-critical vs advisory vs AO-only path-specific.
  - Evidence: `docs/reports/INDEX.md` exists but has no equivalent canonical mapping for this inventory.

## 8) Environment-contract note
- The issue signal mentioned a Node.js mismatch (`README` claiming >=20 vs `package.json` engines >=18). In this scan pass, direct package-engine evidence is captured as `>=18.0.0` in `package.json`; no confirming `README` claim to `>=20` was observed in the targeted read.

## 9) Open evidence needs (smallest doc fixes for gate clarity)
1. Add a short `docs/reports/codebase-trust-pass`-scoped index note mapping workflow intent (release, advisory, AO-only, no-op, security) and execution consequences.
2. Add one-line clarifier in workflow headers/comments for AO-only branches and continuation (`continue-on-error`) cases.
3. Align coverage reporting expectations by documenting why coverage is API-only and what “coverage completeness” means for frontend/runtime domains.
