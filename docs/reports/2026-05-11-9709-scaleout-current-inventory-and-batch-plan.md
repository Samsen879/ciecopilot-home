# 9709 scale-out current inventory and batch plan

日期: 2026-05-11

## Scope

本报告把当前已经落地的 `9709` full scale-out inventory、已完成 shard closeout、local DB 覆盖状态和下一批执行顺序合并成一份可执行计划。

本报告不调用 VLM、不重建截图、不写数据库、不声明 9709 全量 production-ready。当前流程仍然是有人在环的脚本化执行流程: 脚本负责生成、检查、回填和 gate；人工负责 shard 边界、visual disposition、authority sidecar 和 release 声明。

## Repo Truth Inputs

- full manifest: `data/manifests/9709_full_scaleout_manifest_v1.json`
- inventory snapshot: `docs/reports/2026-05-04-9709-full-scaleout-inventory.json`
- previous scale-out plan: `docs/reports/2026-05-04-9709-full-scaleout-plan.md`
- latest completed shard closeout: `docs/reports/2026-05-10-9709-p1-w-standard-001-production-ready.md`
- current branch: `codex/9709-wave1-summary-doc`

Preflight note: `npm run workflow:codex-preflight -- --json` is still unavailable in this checkout because `package.json` has no `workflow:codex-preflight` script. This is an environment/workflow fact, not a product blocker for this docs-only inventory report.

## Current Top-Level Inventory

| Metric | Value |
|---|---:|
| PDFs total | 360 |
| watermarked PDFs | 42 |
| targeted q01-q15 probe slots | 5400 |
| parseable question rows | 2935 |
| unresolved probe slots | 2465 |
| multi-page locator rows | 923 |
| shards total | 36 |
| production-ready shards | 6 |
| production-ready rows | 1120 |
| remaining rows by shard plan | 1815 |

`unresolved probe slots` are dry locator misses from the q01-q15 probe envelope. They are not proof that printed questions are missing.

## Current Local DB Coverage

This DB check used the 2935 `storage_key` values in `data/manifests/9709_full_scaleout_manifest_v1.json` against the local Postgres database at `127.0.0.1:54322`.

| Metric | Value |
|---|---:|
| manifest_count | 2935 |
| registry rows present | 1155 |
| registry rows missing | 1780 |
| joined snapshots | 1155 |
| snapshot_missing | 0 |
| prompt_missing | 0 |
| provenance_missing | 0 |
| search_text_missing | 0 |
| materialized_classifier_missing | 21 |

Interpretation:

- `1120` rows are covered by shard-scoped production-ready closeouts.
- `35` additional manifest rows are present in DB from earlier work, but they are not covered by a full shard closeout and must not be counted as production-ready.
- The remaining product work is not "run all questions at once"; it is to move the remaining shards through the same closed-loop sequence used by the six completed standard P1/P3 shards.

## Completed Production-Ready Shards

| Shard | Rows | PDFs | Evidence |
|---|---:|---:|---|
| `p1_m_standard_001` | 85 | 8 | `docs/reports/2026-05-04-9709-p1-m-standard-001-production-ready.md` |
| `p1_s_standard_001` | 259 | 24 | `docs/reports/2026-05-07-9709-p1-s-standard-001-production-ready.md` |
| `p1_w_standard_001` | 228 | 21 | `docs/reports/2026-05-10-9709-p1-w-standard-001-production-ready.md` |
| `p3_m_standard_001` | 83 | 8 | `docs/reports/2026-05-05-9709-p3-m-standard-001-production-ready.md` |
| `p3_s_standard_001` | 246 | 24 | `docs/reports/2026-05-09-9709-p3-s-standard-001-production-ready.md` |
| `p3_w_standard_001` | 219 | 21 | `docs/reports/2026-05-10-9709-p3-w-standard-001-production-ready.md` |

Completed total: `1120` rows across `106` PDFs.

These are the only shards that should currently be described as shard-scoped production-ready.

## Remaining Shards

| Shard | Rows | PDFs | Risk | Status |
|---|---:|---:|---|---|
| `p1_m_watermarked_001` | 12 | 1 | core/watermarked | not started |
| `p1_s_watermarked_001` | 33 | 3 | core/watermarked | not started |
| `p1_w_watermarked_001` | 32 | 3 | core/watermarked | not started |
| `p3_m_watermarked_001` | 10 | 1 | core/watermarked | not started |
| `p3_s_watermarked_001` | 30 | 3 | core/watermarked | not started |
| `p3_w_watermarked_001` | 30 | 3 | core/watermarked | not started |
| `p2_m_standard_001` | 57 | 8 | mechanics/release-coverage-needed | not started |
| `p2_s_standard_001` | 173 | 24 | mechanics/release-coverage-needed | not started |
| `p2_w_standard_001` | 151 | 21 | mechanics/release-coverage-needed | not started |
| `p4_m_standard_001` | 55 | 8 | mechanics/release-coverage-needed | not started |
| `p4_s_standard_001` | 164 | 24 | mechanics/release-coverage-needed | not started |
| `p4_w_standard_001` | 145 | 21 | mechanics/release-coverage-needed | not started |
| `p2_m_watermarked_001` | 7 | 1 | mechanics/watermarked | not started |
| `p2_s_watermarked_001` | 23 | 3 | mechanics/watermarked | not started |
| `p2_w_watermarked_001` | 22 | 3 | mechanics/watermarked | not started |
| `p4_m_watermarked_001` | 7 | 1 | mechanics/watermarked | not started |
| `p4_s_watermarked_001` | 20 | 3 | mechanics/watermarked | not started |
| `p4_w_watermarked_001` | 21 | 3 | mechanics/watermarked | not started |
| `p5_m_standard_001` | 54 | 8 | outside-current-release-scope | not started |
| `p5_s_standard_001` | 164 | 24 | outside-current-release-scope | not started |
| `p5_w_standard_001` | 142 | 21 | outside-current-release-scope | not started |
| `p6_m_standard_001` | 54 | 8 | outside-current-release-scope | not started |
| `p6_s_standard_001` | 170 | 24 | outside-current-release-scope | not started |
| `p6_w_standard_001` | 144 | 21 | outside-current-release-scope | not started |
| `p5_m_watermarked_001` | 6 | 1 | outside-scope/watermarked | not started |
| `p5_s_watermarked_001` | 21 | 3 | outside-scope/watermarked | not started |
| `p5_w_watermarked_001` | 21 | 3 | outside-scope/watermarked | not started |
| `p6_m_watermarked_001` | 7 | 1 | outside-scope/watermarked | not started |
| `p6_s_watermarked_001` | 19 | 3 | outside-scope/watermarked | not started |
| `p6_w_watermarked_001` | 21 | 3 | outside-scope/watermarked | not started |

Remaining total: `1815` rows across `254` PDFs.

## Recommended Batch Order

### Phase 1: Finish Core P1/P3 Watermarked

Goal: close the remaining core P1/P3 family while isolating watermark-specific visual risk.

| Shard | Rows | PDFs | Next stop |
|---|---:|---:|---|
| `p1_m_watermarked_001` | 12 | 1 | page-chain + watermark visual disposition |
| `p3_m_watermarked_001` | 10 | 1 | page-chain + watermark visual disposition |
| `p1_s_watermarked_001` | 33 | 3 | page-chain + watermark visual disposition |
| `p3_s_watermarked_001` | 30 | 3 | page-chain + watermark visual disposition |
| `p1_w_watermarked_001` | 32 | 3 | page-chain + watermark visual disposition |
| `p3_w_watermarked_001` | 30 | 3 | page-chain + watermark visual disposition |

Phase 1 total: `147` rows across `14` PDFs.

Rationale: these are closest to the already completed P1/P3 standard shards, but the watermark variants should not be mixed with standard PDFs. The first run should be `p1_m_watermarked_001` because it is the smallest real watermark shard.

### Phase 2: Paper 2/4 Standard Mechanics

Goal: build screenshot/evidence/analysis coverage for mechanics papers without pretending the current P1/P3 release posture automatically applies.

| Shard | Rows | PDFs | Next stop |
|---|---:|---:|---|
| `p2_m_standard_001` | 57 | 8 | page-chain + evidence + mechanics authority stop |
| `p4_m_standard_001` | 55 | 8 | page-chain + evidence + mechanics authority stop |
| `p2_s_standard_001` | 173 | 24 | page-chain + evidence + mechanics authority stop |
| `p4_s_standard_001` | 164 | 24 | page-chain + evidence + mechanics authority stop |
| `p2_w_standard_001` | 151 | 21 | page-chain + evidence + mechanics authority stop |
| `p4_w_standard_001` | 145 | 21 | page-chain + evidence + mechanics authority stop |

Phase 2 total: `745` rows across `106` PDFs.

Stop rule: do not declare shard production-ready until mechanics topic authority, classifier family coverage, and release-scope policy are explicitly satisfied. A shard may be evidence-ready/backfilled before it is release-ready.

### Phase 3: Paper 2/4 Watermarked Mechanics

Goal: repeat Phase 2 for watermarked mechanics only after the standard mechanics path is stable.

| Shard | Rows | PDFs |
|---|---:|---:|
| `p2_m_watermarked_001` | 7 | 1 |
| `p4_m_watermarked_001` | 7 | 1 |
| `p2_s_watermarked_001` | 23 | 3 |
| `p4_s_watermarked_001` | 20 | 3 |
| `p2_w_watermarked_001` | 22 | 3 |
| `p4_w_watermarked_001` | 21 | 3 |

Phase 3 total: `100` rows across `14` PDFs.

### Phase 4: Paper 5/6 Standard Statistics

Goal: produce durable screenshot/evidence/analysis coverage while keeping release language conservative because these shards are outside the current released scoring scope.

| Shard | Rows | PDFs |
|---|---:|---:|
| `p5_m_standard_001` | 54 | 8 |
| `p6_m_standard_001` | 54 | 8 |
| `p5_s_standard_001` | 164 | 24 |
| `p6_s_standard_001` | 170 | 24 |
| `p5_w_standard_001` | 142 | 21 |
| `p6_w_standard_001` | 144 | 21 |

Phase 4 total: `728` rows across `106` PDFs.

Stop rule: the allowed claim should be `evidence-ready` or `analysis-backfilled` unless a separate release-scope decision promotes the relevant P5/P6 runtime family.

### Phase 5: Paper 5/6 Watermarked Statistics

Goal: complete remaining watermarked statistics coverage after standard P5/P6 behavior is stable.

| Shard | Rows | PDFs |
|---|---:|---:|
| `p5_m_watermarked_001` | 6 | 1 |
| `p6_m_watermarked_001` | 7 | 1 |
| `p5_s_watermarked_001` | 21 | 3 |
| `p6_s_watermarked_001` | 19 | 3 |
| `p5_w_watermarked_001` | 21 | 3 |
| `p6_w_watermarked_001` | 21 | 3 |

Phase 5 total: `95` rows across `14` PDFs.

## Per-Shard Execution Contract

Each shard should use the same closed loop unless a phase-specific stop rule says otherwise:

1. Build or confirm shard manifest from `data/manifests/9709_full_scaleout_manifest_v1.json`.
2. Run PDF page-chain extraction for only that shard's PDFs.
3. Generate page-chain report and warning disposition.
4. Generate screenshot/review-crop index and evidence bundles.
5. Run post-extraction review.
6. Complete human visual disposition for diagram/table/multi-page/watermark items.
7. Build authority sidecar from seeded topic paths only; do not invent prompt text or syllabus nodes.
8. Run authority-ready batch dry-run.
9. Run formal registry backfill and analysis hydration only after authority sidecar passes.
10. Run DB coverage, search gate, and release preflight.
11. Write shard-scoped closeout with conservative status wording.

## Required Artifact Names

For shard `<shard_id>`, use this naming pattern:

- `data/manifests/9709_<shard_id>_page_chain_surface_v1.json`
- `data/manifests/9709_<shard_id>_authority_sidecar_v1.json`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-page-chain-report.{json,md}`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-warning-disposition.{json,md}`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-evidence-bundle-summary.{json,md}`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-evidence-bundles.json`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-human-visual-dispositions.json`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-human-visual-disposition.md`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-post-extraction-review.{json,md}`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-authority-visual-review.{json,md}`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-authority-manifest.json`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-aligned-manifest.json`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-ready-manifest.json`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-authority-evidence-bundles.json`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-db-coverage.json`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-search-gate.json`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-search-gate-report.md`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-release-preflight-final.{json,md}`
- `docs/reports/YYYY-MM-DD-9709-<shard-id-with-dashes>-production-ready.md` only when the shard really satisfies production-ready conditions.

## Immediate Next Action

Run `p1_m_watermarked_001` as the first Phase 1 shard.

Why this shard:

- It is small: `12` rows, `1` PDF.
- It exercises the watermarked path without a large blast radius.
- It stays in the already proven P1/P3 core family.
- It gives a concrete answer to whether the existing page-chain/evidence/review/authority flow handles watermark artifacts cleanly.

Do not start P2/P4/P5/P6 until this watermarked core smoke shard has passed page-chain, visual disposition, authority sidecar, DB coverage, search gate, and release preflight, or until it produces an explicit blocker report.
