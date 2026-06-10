# 9702 full production-ready closeout

日期: 2026-06-10

## Verdict

Cambridge 9702 Physics row-level question-text foundation is production-ready across all `4137/4137` accepted rows.

- aggregate gate status: `pass`
- production_ready_claimed: `true`
- full row coverage: `4137/4137`
- page-chain surface coverage: `25/25`
- source QP PDF coverage: `362/362`
- production batch coverage: `25/25`
- text-only ready rows: `2782`
- image-context required rows: `1355`
- DB/question_bank registry coverage: `4137/4137`
- production search coverage: `4137/4137`, source `question_plain_text_v2.normalized_plain_text`
- production read-model coverage: `4137/4137`, source `question_plain_text_v2.normalized_plain_text`
- production RAG chunk coverage: `4137/4137`, source `question_plain_text_v2.normalized_plain_text`
- duplicate storage-key/q_number rows: `0`
- production rows missing from row-surface manifests: `0`
- production rows extra beyond row-surface manifests: `0`
- remaining blockers: `0`

## DB Readback

- database surface: `docker:supabase_db_ciecopilot-home`
- readback status: `pass`
- manifest rows: `4137`
- question_bank rows: `4137`
- active snapshots: `4137`
- classifier rows: `4137`
- search source rows: `4137`
- read-model source rows: `4137`
- RAG chunks present: `4137`
- RAG chunks with FTS: `4137`

## Production Surface Manifests

| Production surface manifest | Wave | Rows | Shards | Source PDFs | Claimed |
| --- | --- | ---: | ---: | ---: | --- |
| `data/manifests/9702_p1_m_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p1_m_historical_001` | 360 | 1 | 9 | `true` |
| `data/manifests/9702_p1_s_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p1_s_historical_001` | 1000 | 1 | 25 | `true` |
| `data/manifests/9702_p1_s_promoted_public_001_production_surface_2026_06_10_manifest_v1.json` | `p1_s_promoted_public_001` | 160 | 1 | 4 | `true` |
| `data/manifests/9702_p1_w_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p1_w_historical_001` | 1000 | 1 | 25 | `true` |
| `data/manifests/9702_p1_w_promoted_public_001_production_surface_2026_06_10_manifest_v1.json` | `p1_w_promoted_public_001` | 160 | 1 | 4 | `true` |
| `data/manifests/9702_p2_m_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p2_m_historical_001` | 62 | 1 | 9 | `true` |
| `data/manifests/9702_p2_s_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p2_s_historical_001` | 156 | 1 | 23 | `true` |
| `data/manifests/9702_p2_s_promoted_public_001_production_surface_2026_06_10_manifest_v1.json` | `p2_s_promoted_public_001` | 28 | 1 | 4 | `true` |
| `data/manifests/9702_p2_w_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p2_w_historical_001` | 162 | 1 | 24 | `true` |
| `data/manifests/9702_p2_w_promoted_public_001_production_surface_2026_06_10_manifest_v1.json` | `p2_w_promoted_public_001` | 24 | 1 | 4 | `true` |
| `data/manifests/9702_p3_m_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p3_m_historical_001` | 18 | 1 | 9 | `true` |
| `data/manifests/9702_p3_s_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p3_s_historical_001` | 80 | 1 | 40 | `true` |
| `data/manifests/9702_p3_s_promoted_public_001_production_surface_2026_06_10_manifest_v1.json` | `p3_s_promoted_public_001` | 14 | 1 | 7 | `true` |
| `data/manifests/9702_p3_w_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p3_w_historical_001` | 80 | 1 | 40 | `true` |
| `data/manifests/9702_p3_w_promoted_public_001_production_surface_2026_06_10_manifest_v1.json` | `p3_w_promoted_public_001` | 14 | 1 | 7 | `true` |
| `data/manifests/9702_p4_m_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p4_m_historical_001` | 102 | 1 | 9 | `true` |
| `data/manifests/9702_p4_s_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p4_s_historical_001` | 234 | 1 | 21 | `true` |
| `data/manifests/9702_p4_s_promoted_public_001_production_surface_2026_06_10_manifest_v1.json` | `p4_s_promoted_public_001` | 41 | 1 | 4 | `true` |
| `data/manifests/9702_p4_w_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p4_w_historical_001` | 270 | 1 | 24 | `true` |
| `data/manifests/9702_p4_w_promoted_public_001_production_surface_2026_06_10_manifest_v1.json` | `p4_w_promoted_public_001` | 40 | 1 | 4 | `true` |
| `data/manifests/9702_p5_m_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p5_m_historical_001` | 18 | 1 | 9 | `true` |
| `data/manifests/9702_p5_s_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p5_s_historical_001` | 50 | 1 | 25 | `true` |
| `data/manifests/9702_p5_s_promoted_public_001_production_surface_2026_06_10_manifest_v1.json` | `p5_s_promoted_public_001` | 8 | 1 | 4 | `true` |
| `data/manifests/9702_p5_w_historical_001_production_surface_2026_06_10_manifest_v1.json` | `p5_w_historical_001` | 48 | 1 | 24 | `true` |
| `data/manifests/9702_p5_w_promoted_public_001_production_surface_2026_06_10_manifest_v1.json` | `p5_w_promoted_public_001` | 8 | 1 | 4 | `true` |

## Shard Coverage

| Shard | Rows |
| --- | ---: |
| `9702_p1_m_historical_001` | 360 |
| `9702_p1_s_historical_001` | 1000 |
| `9702_p1_s_promoted_public_001` | 160 |
| `9702_p1_w_historical_001` | 1000 |
| `9702_p1_w_promoted_public_001` | 160 |
| `9702_p2_m_historical_001` | 62 |
| `9702_p2_s_historical_001` | 156 |
| `9702_p2_s_promoted_public_001` | 28 |
| `9702_p2_w_historical_001` | 162 |
| `9702_p2_w_promoted_public_001` | 24 |
| `9702_p3_m_historical_001` | 18 |
| `9702_p3_s_historical_001` | 80 |
| `9702_p3_s_promoted_public_001` | 14 |
| `9702_p3_w_historical_001` | 80 |
| `9702_p3_w_promoted_public_001` | 14 |
| `9702_p4_m_historical_001` | 102 |
| `9702_p4_s_historical_001` | 234 |
| `9702_p4_s_promoted_public_001` | 41 |
| `9702_p4_w_historical_001` | 270 |
| `9702_p4_w_promoted_public_001` | 40 |
| `9702_p5_m_historical_001` | 18 |
| `9702_p5_s_historical_001` | 50 |
| `9702_p5_s_promoted_public_001` | 8 |
| `9702_p5_w_historical_001` | 48 |
| `9702_p5_w_promoted_public_001` | 8 |


## Evidence Policy

- Row-surface proof comes from `data/manifests/9702_full_row_surface_2026_06_09_manifest_v1.json`, the 25 page-chain surface manifests referenced there, and the 25 production surface manifests listed by the Phase 7 production batch plan.
- Old eval, benchmark, and RAG sample artifacts were not used as row-surface proof.

## Boundary

- This is row-level question-text production readiness, not a claim of perfect semantic retrieval quality, mark-scheme scoring quality, or complete detailed physics syllabus taxonomy.
- The classifier remains a non-released question-text-foundation row-surface classifier; authoritative scoring is not claimed.
- RAG proof covers deterministic question_plain_text_v2 rows in public.chunks and source attribution, not semantic retrieval-quality evaluation.
- Parent issue #402 must be updated or closed only after this PR merges and main contains the aggregate closeout artifacts.

## Artifacts

- generator: `scripts/learning/run_9702_full_production_ready_aggregate_gate.js`
- machine gate: `docs/reports/2026-06-10-9702-full-production-ready-gate.json`
- markdown closeout: `docs/reports/2026-06-10-9702-full-production-ready-closeout.md`
