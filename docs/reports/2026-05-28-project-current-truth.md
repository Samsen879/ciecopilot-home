# Project Current Truth Report

日期: 2026-05-28

## Scope

本报告建立当前项目事实层。默认事实基线是已经执行 `git fetch --all --prune` 后的 `origin/main`，不是任务开始时的 checkout 分支、聊天记录、AO 元数据或未合并 worktree。

本报告只写文档事实，不修改题库数据、manifest、DB、source PDFs 或 runtime 代码。

Update note (2026-05-29): 本报告中的 9709 production-readiness 数字已被 `docs/reports/2026-05-29-9709-production-readiness-status.md` supersede。当前 repo truth 是 `1267/2935` production-ready rows、zero active visual-stop rows、`1668` remaining rows。

## Baseline Snapshot

| Item | Value |
|---|---|
| repo | `/home/samsen/code/ciecopilot-home` |
| fetched remote baseline | `origin/main` |
| `origin/main` commit | `00c83a11c24cef41fd5aac97e7e10d4363124013` |
| `origin/main` subject | `docs: report 9709 production readiness status` |
| report worktree | `/tmp/ciecopilot-project-truth-20260528` |
| report branch | `codex/project-truth-20260528` |
| report branch base | `origin/main` at `00c83a11c24cef41fd5aac97e7e10d4363124013` |
| report worktree dirty before edits | no |
| root checkout branch at task start | `codex/9709-wave1-summary-doc` |
| root checkout HEAD at task start | `977cd8ee6ad5c2ab43948ed7e410f91e632a3725` |
| root checkout dirty at task start | yes |

结论: root checkout `codex/9709-wave1-summary-doc` 是任务开始时发现的旧且 dirty 的工作分支；本报告的事实基线不是该分支，而是 `origin/main @ 00c83a1` (`00c83a11c24cef41fd5aac97e7e10d4363124013`)。

Root checkout dirty files observed before this report worktree was created:

- modified: `docs/reports/INDEX.md`
- modified: `scripts/vlm/qwen_openai_client_v1.py`
- modified: `tests/test_qwen_openai_client_v1.py`
- untracked: `docs/reports/2026-04-24-9709-release-preflight.json`
- untracked: `docs/reports/2026-04-24-9709-release-preflight.md`
- untracked: `docs/reports/2026-05-28-9709-winter-watermarked-external-source-candidates.md`
- untracked: `docs/reports/2026-05-28-9709-winter-watermarked-source-remediation-inventory.md`
- untracked: `scripts/learning/export_9709_authority_batch_analysis_from_db.py`

`package.json` does not contain `scripts.workflow:codex-preflight`. Therefore `npm run workflow:codex-preflight -- --json` is not available in this checkout. This is a repo/workflow fact, not a production-readiness gate result.

## Evidence Inputs

Primary repo-truth inputs read for this report:

- `docs/reports/2026-05-26-9709-production-readiness-status.md`
- `docs/reports/2026-05-11-9709-scaleout-current-inventory-and-batch-plan.md`
- latest `docs/reports/*production-ready.md`: `docs/reports/2026-05-16-9709-p3-s-watermarked-001-production-ready.md`
- latest `docs/reports/*visual-review-stop.md`: `docs/reports/2026-05-26-9709-p3-w-watermarked-001-visual-review-stop.md`
- related current visual-stop evidence: `docs/reports/2026-05-25-9709-p1-w-watermarked-001-visual-review-stop.md`
- `docs/superpowers/specs/2026-03-20-prd-learning-runtime-contract-design.md`
- `docs/superpowers/plans/2026-03-20-prd-learning-runtime-pilot-slice-execution.md`
- `docs/reports/learning_runtime_released_family_gate_2026-03-25.md`
- supporting learning-runtime status reports discovered in repo truth:
  - `docs/reports/2026-04-06-learning-runtime-closeout-matrix.md`
  - `docs/reports/learning_runtime_event_pipeline_gate_2026-04-12.md`
- manifest cross-check: `data/manifests/9709_full_scaleout_manifest_v1.json`
- index: `docs/reports/INDEX.md`

All 9709 production-readiness numbers below are sourced from `docs/reports/2026-05-26-9709-production-readiness-status.md` on `origin/main` commit `00c83a11c24cef41fd5aac97e7e10d4363124013`, with total parseable row count cross-checked against `data/manifests/9709_full_scaleout_manifest_v1.json`.

## Mainline Timeline

| Date | Repo truth |
|---|---|
| 2026-03-20 | Learning-runtime contract and pilot execution baseline were frozen. Scope is `9709`; legacy Study Hub is not canonical runtime truth. |
| 2026-03-25 | Released-family gate line was added for trigonometry, `9709.integration.application`, and `9709.differential_equations.separable`; current checked-in gate report records pass and `release_ready: true`. |
| 2026-04-06 | Learning-runtime closeout matrix recorded two focused test batches, frontend build, and `learning:release-gate` as passing. This is checked-in report evidence, not a rerun in this current-truth task. |
| 2026-04-12 / 2026-04-14 | Learning event pipeline gate report records `phase0_ready: true`; released-family gate report in the current tree records `generated_at: 2026-04-14T02:06:45.000Z`. |
| 2026-05-04 | Full 9709 scale-out inventory established `2935` parseable rows across `36` shards and `360` PDFs; `p1_m_standard_001` became shard-scoped production-ready. |
| 2026-05-05 to 2026-05-10 | P1/P3 standard March/Summer/Winter shards reached shard-scoped production-ready. The 2026-05-11 plan recorded 6 production-ready shards and `1120` rows at that older point. |
| 2026-05-11 to 2026-05-12 | Watermarked P1 March smoke shard moved from visual-review stop to production-ready after accepted human visual dispositions and downstream gates. |
| 2026-05-15 to 2026-05-16 | Additional watermarked P3 March, P1 Summer, and P3 Summer shards reached shard-scoped production-ready. Latest production-ready report is `p3_s_watermarked_001`, `30` rows, `3` PDFs. |
| 2026-05-25 | `p1_w_watermarked_001` stopped after targeted high-resolution visual review found watermark occlusion blockers on `WM_9709_w19_qp_11` q07-q11. |
| 2026-05-26 | `p3_w_watermarked_001` stopped after targeted review rejected 29 of 30 original crop stacks. Same day, current production-readiness report established the latest aggregate state: `1205 / 2935` production-ready rows. |

## PRD / Learning Runtime Alignment

| Contract or plan item | Current repo-truth status |
|---|---|
| Pilot subject is `9709`. | Satisfied in the frozen contract and learning-runtime implementation file tree. |
| Released authoritative question types are narrow. | Current frozen set is `9709.trigonometry.identities`, `9709.trigonometry.equations`, `9709.integration.application`, and `9709.differential_equations.separable`. Broader integration and differential-equations variants remain `non_released_fallback` unless separately promoted. |
| Runtime scoring requires more than type membership. | `api/learning/lib/contracts/released-scope.js` requires released question-type match, released state, released-family evidence, rubric/confidence/uncertainty posture before returning released scoring posture. |
| New runtime must not build canonical truth on legacy Study Hub. | The contract freezes this rule. The checked-in implementation has `api/learning/**`, `src/pages/learning-runtime/**`, `src/components/learning-runtime/**`, learning-runtime API client files, and learning-runtime migrations. |
| Learning-runtime closeout. | `docs/reports/2026-04-06-learning-runtime-closeout-matrix.md` records passing focused backend/frontend test batches, `npm run build`, and `npm run learning:release-gate`. This report did not rerun that full matrix. |
| Released-family gate. | `docs/reports/learning_runtime_released_family_gate_2026-03-25.md` records `status: pass`, `release_ready: true`, and pass status for trigonometry, integration application, and separable differential equations. |
| Event pipeline gate. | `docs/reports/learning_runtime_event_pipeline_gate_2026-04-12.md` records `status: pass`, `phase0_ready: true`, ordered pipeline, replay, dedupe, idempotency, stream lock, and out-of-order guard pass. |
| 9709 full question-bank production readiness. | Not complete. This is a separate scale-out/release evidence line from the learning-runtime core. Current aggregate is `1205 / 2935` production-ready rows. |

## 9709 Production Readiness Numbers

| Metric | Value | Source |
|---|---:|---|
| total parseable rows | `2935` | `data/manifests/9709_full_scaleout_manifest_v1.json`; also `2026-05-26-9709-production-readiness-status.md` |
| production-ready rows | `1205` | `2026-05-26-9709-production-readiness-status.md` |
| visual-stop rows | `62` | `2026-05-26-9709-production-readiness-status.md`; visual-stop reports for `p1_w_watermarked_001` and `p3_w_watermarked_001` |
| not-started rows | `1668` | `2026-05-26-9709-production-readiness-status.md`; also `2935 - 1205 - 62` |
| production-ready percentage | `41.1%` | `1205 / 2935`, rounded to one decimal place |

Current category split:

| Category | Shards | Rows | PDFs | Current status |
|---|---:|---:|---:|---|
| shard-scoped production-ready | `10` | `1205` | `114` | closed-loop complete |
| extracted/evidence-built but visual-stop | `2` | `62` | `6` | source-quality blockers |
| not started in scale-out execution | `24` | `1668` | `240` | no shard closeout yet |
| total current parseable inventory | `36` | `2935` | `360` | current full-scaleout target |

Conflict note: `docs/reports/2026-05-11-9709-scaleout-current-inventory-and-batch-plan.md` is older and reports `6` production-ready shards, `1120` production-ready rows, and `1815` remaining rows. That was true for its date. For current truth, it is superseded by `docs/reports/2026-05-26-9709-production-readiness-status.md`.

## Completed Shards

Production-ready claims are safe only for these shard-scoped closeouts:

| Shard | Rows | PDFs | Evidence |
|---|---:|---:|---|
| `p1_m_standard_001` | `85` | `8` | `docs/reports/2026-05-04-9709-p1-m-standard-001-production-ready.md` |
| `p1_s_standard_001` | `259` | `24` | `docs/reports/2026-05-07-9709-p1-s-standard-001-production-ready.md` |
| `p1_w_standard_001` | `228` | `21` | `docs/reports/2026-05-10-9709-p1-w-standard-001-production-ready.md` |
| `p3_m_standard_001` | `83` | `8` | `docs/reports/2026-05-05-9709-p3-m-standard-001-production-ready.md` |
| `p3_s_standard_001` | `246` | `24` | `docs/reports/2026-05-09-9709-p3-s-standard-001-production-ready.md` |
| `p3_w_standard_001` | `219` | `21` | `docs/reports/2026-05-10-9709-p3-w-standard-001-production-ready.md` |
| `p1_m_watermarked_001` | `12` | `1` | `docs/reports/2026-05-12-9709-p1-m-watermarked-001-production-ready.md` |
| `p3_m_watermarked_001` | `10` | `1` | `docs/reports/2026-05-15-9709-p3-m-watermarked-001-production-ready.md` |
| `p1_s_watermarked_001` | `33` | `3` | `docs/reports/2026-05-15-9709-p1-s-watermarked-001-production-ready.md` |
| `p3_s_watermarked_001` | `30` | `3` | `docs/reports/2026-05-16-9709-p3-s-watermarked-001-production-ready.md` |

The latest production-ready report, `2026-05-16-9709-p3-s-watermarked-001-production-ready.md`, is limited to `p3_s_watermarked_001`. It does not make any other shard production-ready.

## Current Blockers

### Source-quality blockers

- `p1_w_watermarked_001`: `32` rows, `3` PDFs. Targeted visual review found red watermark occlusion blockers on `WM_9709_w19_qp_11` q07-q11. Downstream authority/write-back/search/release gates were not run.
- `p3_w_watermarked_001`: `30` rows, `3` PDFs. Targeted high-resolution review rejected `29 / 30` original crop stacks, with repeated watermark overlap on question text, formulae, diagram-related text, mark allocations, or continuation content. Downstream gates were not run.

These `62` rows are not extraction gaps. They are source-quality blockers requiring non-occluding source replacement/re-run or explicit park as not production-ready.

### Release-scope blockers

- P2/P4 mechanics: `845` rows across `120` PDFs are not started. Even after extraction/evidence, production-ready requires mechanics authority, classifier/search, and release preflight coverage. P1/P3 core closeouts do not prove mechanics release readiness.
- P5/P6 statistics: `823` rows across `120` PDFs are not started and are outside current release scope. They can move toward evidence-ready or analysis-backfilled status, but production-ready requires a separate release-scope promotion decision.

### Authority / syllabus blockers

- Completed shards used shard-scoped authority sidecars mapped only to existing seeded topic paths; they did not add new syllabus nodes.
- Full 9709 production-ready still requires authority coverage for P2/P4/P5/P6 and confirmation that pending human-review topic/boundary items do not block those mappings.
- The rejected issue `#293` baseline remains quarantined history, not canonical authority.

### Aggregate gate blockers

No checked-in aggregate production gate currently proves all `2935 / 2935` parseable rows are release-ready. Before a full 9709 production-ready claim, repo truth still needs at least:

- registry coverage for all `2935` manifest rows
- snapshots, prompt material, provenance, search text, and materialized classifier fields complete or accepted as explicit exceptions
- question search gate coverage at aggregate or approved representative-fixture level
- release preflight over the full manifest with all warnings inside accepted contract boundaries
- report index and current-truth/readiness reports updated to match the gate result

## Safe And Unsafe Production-Ready Language

Safe statements:

- `9709` has `10` shard-scoped production-ready closeouts covering `1205` rows and `114` PDFs.
- Current full-scaleout target is `2935` parseable rows.
- Current production-ready coverage is `1205 / 2935`, about `41.1%`.
- P1/P3 core standard shards and March/Summer watermarked shards listed above are production-ready at shard scope.
- `p1_w_watermarked_001` and `p3_w_watermarked_001` are evidence-built but stopped by source-quality visual blockers.

Unsafe statements:

- Do not call the whole `9709` question bank production-ready.
- Do not count DB-present rows without shard closeout as production-ready.
- Do not treat `2465` unresolved q01-q15 probe slots as the same thing as production-readiness missing rows.
- Do not call P2/P4 mechanics production-ready based on P1/P3 core evidence.
- Do not call P5/P6 statistics production-ready without a release-scope decision.
- Do not accept watermarked Winter P1/P3 blockers by inference or guessed human disposition.

## Recommended Next Steps

1. Resolve `p1_w_watermarked_001` source quality first: find non-occluding source/pages for `WM_9709_w19_qp_11` q07-q11 or park the blocked source/shard as not production-ready; then rerun page-chain, crops, post-extraction review, human visual disposition, authority sidecar, registry/analysis backfill, DB coverage, search gate, and release preflight.
2. Resolve `p3_w_watermarked_001` source quality next: replace or park the Winter 2019 Paper 3 watermarked sources; then rerun the same downstream chain. This is the other blocker preventing P1/P3 core from moving from `1205 / 1267` to `1267 / 1267`.
3. Only after those `62` source-blocked rows are resolved, run a P1/P3 core aggregate check and update the production-readiness report.
4. Start P2/P4 mechanics with a small standard shard, such as `p2_m_standard_001` or `p4_m_standard_001`, with an explicit target of evidence-ready plus mechanics authority stop. Do not pre-commit to production-ready wording.
5. Keep P5/P6 statistics out of production-ready language until a release-scope promotion decision exists. If work starts there, label it evidence-ready or analysis-backfilled unless the release contract changes.
6. Add an aggregate gate artifact before any future full-9709 production-ready claim.

## Repo Truth Versus Inference

Repo-truth conclusions in this report:

- branch, HEAD, dirty-worktree, and `origin/main` commit state
- absence of `workflow:codex-preflight` in `package.json`
- checked-in learning-runtime contract, plan, implementation file inventory, and gate reports
- `2935` manifest row count
- `1205` production-ready rows, `62` visual-stop rows, `1668` not-started rows, and `41.1%` production-ready coverage
- completed shard list and visual-stop blocker list

Inferences and recommendations:

- `1668` not-started rows can be recomputed as `2935 - 1205 - 62`; this matches the latest production-readiness report.
- P1/P3 core would reach `1267 / 1267` only if the two Winter watermarked visual-stop shards are remediated and pass downstream gates.
- Prioritized next steps are project-truth recommendations derived from the latest blockers and do not themselves prove any gate.
