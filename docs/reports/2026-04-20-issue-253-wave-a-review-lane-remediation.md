# Issue 253: Wave A Bounded Review-Lane Remediation

Date: 2026-04-20
Issue: `#253`
Status: code fix landed, targeted verification pass, local baseline gate rerun blocked by current branch data state

## Scope

Bound the change to the single Wave A shard-3 follow-up case:

- `9709/s22_qp_13/questions/q02.png`

No prompt changes, schema changes, or general threshold softening were introduced.

## Source Evidence

Authoritative Wave A evidence remains the closeout line recorded in commit `4427c35` / `origin/feat/242`.

- `git show 4427c35:docs/reports/2026-04-19-9709-wave-a-closeout-summary.json`
  - `shard3_follow_up_cases = ["9709/s22_qp_13/questions/q02.png"]`
  - `baseline_gate_result.pass = true`
  - `baseline_gate_result.metrics = {"exact_structured_match_rate":1,"subject_leakage_rate":0,"metadata_completeness_rate":1,"null_summary_rate":0}`
- `git show 4427c35:docs/reports/2026-04-19-9709-wave-a-shard3-full-review.json`
  - the row was routed as `review_lane`
  - deterministic review marked `route_verdict = "over_conservative"`
- `git show 4427c35:data/manifests/9709_question_search_expansion_wave_a_v1.json`
  - the manifest row already carried:
    - `route_hint = "diagram_lane"`
    - `diagram_present = true`
    - `formula_dense = false`
    - `table_heavy = false`
    - `surface_evidence_status = "verified_primary_asset"`
    - `gate_critical = true`
    - `requires_review` absent / false in the repaired execution line

That combination shows the row was gate-critical, but not unknown-surface and not review-flagged. The remaining over-conservative behavior came from the blanket `gate_critical -> review_lane` override.

## Remediation

Added a narrow routing exception in both runtime copies of the router:

- `scripts/vlm/qwen_router_v1.py`
- `scripts/learning/lib/question-evidence-bundle-v1.js`

The exception applies only when all of the following are true:

- `gate_critical === true`
- `requires_review === false`
- `route_hint === "diagram_lane"`
- `diagram_present === true`
- `formula_dense === false`
- `table_heavy === false`
- `surface_evidence_status === "verified_primary_asset"`

When that predicate holds, the row uses `diagram_lane` instead of the generic `review_lane` override.

Guard behavior remains unchanged for:

- gate-critical unknown-surface rows
- non-gate rows that still need extraction-first OCR before any review posture

## Regression Coverage

Added targeted regressions for the exact Wave A posture:

- `tests/test_qwen_router_v1.py`
- `scripts/learning/__tests__/question-evidence-bundle-v1.test.js`

The new tests assert that the `9709/s22_qp_13/questions/q02.png` posture resolves to `diagram_lane`, while existing review-lane guard cases stay unchanged.

## Verification

Fresh commands run in this worktree:

```bash
python3 -m venv .venv-issue253
.venv-issue253/bin/pip install pytest
.venv-issue253/bin/pytest tests/test_qwen_router_v1.py -q
```

Result:

- pass
- `6 passed in 0.05s`

```bash
npm install
npm test -- --runInBand scripts/learning/__tests__/question-evidence-bundle-v1.test.js
```

Result:

- pass
- `7 passed, 7 total`

Direct behavior checks also passed for:

- fixed case -> `diagram_lane`
- gate-critical unknown-surface guard -> `review_lane`
- non-gate extraction-first guard -> `ocr_lane`

Baseline gate rerun attempted:

```bash
node scripts/evaluation/run_question_search_gate.js \
  --fixture data/eval/question_search_gold_9709_v1.json \
  --report /tmp/issue-253-baseline-gate-report.md \
  --json-out /tmp/issue-253-baseline-gate.json \
  --psql-mode docker
```

Result:

- fail in the current `main`-based branch state
- reported metrics:
  - `exact_structured_match_rate = 0.8`
  - `subject_leakage_rate = 0`
  - `metadata_completeness_rate = 0.8421`
  - `null_summary_rate = 0.3333`

Interpretation:

- this fix does not widen the baseline gate and does not touch the question-search runtime or DB content used by that gate
- the authoritative Wave A closeout evidence in `4427c35` still records the intended green baseline gate for the repaired shard line
- the fresh local rerun shows the current branch/data surface is not at that historical baseline, so this issue closes the bounded router regression but does not claim a fresh full Wave A re-closeout from `main`
