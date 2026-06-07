# 9231 full production-ready closeout

日期: 2026-06-07

## Verdict

Cambridge 9231 row-level question-text foundation is production-ready across all `1593/1593` rows.

- aggregate gate status: `pass`
- production_ready_claimed: `true`
- full row coverage: `1593/1593`
- shard coverage: `64/64`
- source QP coverage: `200/200`
- DB/question_bank registry coverage: `1593/1593`
- production search coverage: `1593/1593`, source `question_plain_text_v2.normalized_plain_text`
- production read-model coverage: `1593/1593`, source `question_plain_text_v2.normalized_plain_text`
- production RAG chunk coverage: `1593/1593`, source `question_plain_text_v2.normalized_plain_text`
- duplicate storage-key/q_number rows: `0`
- remaining blockers: `0`

## DB Readback

- database surface: `docker:supabase_db_ciecopilot-home`
- readback status: `pass`
- manifest rows: `1593`
- question_bank rows: `1593`
- search source rows: `1593`
- read-model source rows: `1593`
- RAG chunks present: `1593`

## Production Surface Manifests

| Production surface manifest | Wave | Rows | Shards | Source PDFs | Claimed |
| --- | --- | ---: | ---: | ---: | --- |
| `data/manifests/9231_wave1_production_surface_2026_06_06_manifest_v1.json` | `wave1` | 441 | 16 | 56 | `true` |
| `data/manifests/9231_wave3_wave2_batch2_production_surface_2026_06_06_manifest_v1.json` | `wave3_wave2_batch2` | 334 | 16 | 48 | `true` |
| `data/manifests/9231_wave4_production_surface_2026_06_06_manifest_v1.json` | `wave4` | 191 | 10 | 30 | `true` |
| `data/manifests/9231_next_wave_16_production_surface_2026_06_06_manifest_v1.json` | `next_wave_16` | 477 | 16 | 48 | `true` |
| `data/manifests/9231_wm_final_150_production_surface_2026_06_07_manifest_v1.json` | `wm_final_150` | 150 | 6 | 18 | `true` |

## Shard Coverage

| Shard | Rows |
| --- | ---: |
| `9231_p1_s16_standard_001` | 33 |
| `9231_p1_s24_standard_001` | 21 |
| `9231_p1_s25_standard_001` | 28 |
| `9231_p1_w16_standard_001` | 33 |
| `9231_p1_w25_standard_001` | 28 |
| `9231_p2_s16_standard_001` | 33 |
| `9231_p2_s24_standard_001` | 24 |
| `9231_p2_s25_standard_001` | 32 |
| `9231_p2_w16_standard_001` | 30 |
| `9231_p2_w25_standard_001` | 32 |
| `9231_p3_s24_standard_001` | 21 |
| `9231_p3_s25_standard_001` | 28 |
| `9231_p3_w25_standard_001` | 28 |
| `9231_p4_s24_standard_001` | 20 |
| `9231_p4_s25_standard_001` | 24 |
| `9231_p4_w25_standard_001` | 26 |
| `9231_p1_s21_standard_001` | 21 |
| `9231_p1_s22_standard_001` | 21 |
| `9231_p1_s23_standard_001` | 21 |
| `9231_p1_w20_standard_001` | 21 |
| `9231_p1_w21_standard_001` | 21 |
| `9231_p1_w22_standard_001` | 21 |
| `9231_p1_w23_standard_001` | 21 |
| `9231_p1_w24_standard_001` | 21 |
| `9231_p3_s21_standard_001` | 21 |
| `9231_p3_s22_standard_001` | 21 |
| `9231_p3_s23_standard_001` | 21 |
| `9231_p3_w20_standard_001` | 21 |
| `9231_p3_w21_standard_001` | 21 |
| `9231_p3_w22_standard_001` | 21 |
| `9231_p3_w23_standard_001` | 19 |
| `9231_p3_w24_standard_001` | 21 |
| `9231_p2_w23_standard_001` | 24 |
| `9231_p2_w24_standard_001` | 24 |
| `9231_p4_s21_standard_001` | 18 |
| `9231_p4_s22_standard_001` | 18 |
| `9231_p4_s23_standard_001` | 18 |
| `9231_p4_w20_standard_001` | 18 |
| `9231_p4_w21_standard_001` | 18 |
| `9231_p4_w22_standard_001` | 18 |
| `9231_p4_w23_standard_001` | 17 |
| `9231_p4_w24_standard_001` | 18 |
| `9231_p1_s17_standard_001` | 35 |
| `9231_p1_s18_standard_001` | 33 |
| `9231_p1_s19_standard_001` | 33 |
| `9231_p1_w17_standard_001` | 33 |
| `9231_p1_w18_standard_001` | 33 |
| `9231_p2_s17_standard_001` | 33 |
| `9231_p2_s18_standard_001` | 33 |
| `9231_p2_s19_standard_001` | 33 |
| `9231_p2_s21_standard_001` | 24 |
| `9231_p2_s22_standard_001` | 24 |
| `9231_p2_s23_standard_001` | 24 |
| `9231_p2_w17_standard_001` | 33 |
| `9231_p2_w18_standard_001` | 33 |
| `9231_p2_w20_standard_001` | 25 |
| `9231_p2_w21_standard_001` | 24 |
| `9231_p2_w22_standard_001` | 24 |
| `9231_p1_s20_standard_001` | 21 |
| `9231_p1_w19_standard_001` | 33 |
| `9231_p2_s20_standard_001` | 24 |
| `9231_p2_w19_standard_001` | 33 |
| `9231_p3_s20_standard_001` | 21 |
| `9231_p4_s20_standard_001` | 18 |


## Evidence Policy

- Row-surface proof comes from the shard split manifest, all 64 shard page-chain surface manifests, and the five production surface manifests.
- Old eval, benchmark, or RAG sample artifacts were not used as row-surface proof.

## Boundary

- This is row-level question-text production readiness, not a claim of perfect semantic retrieval quality or detailed syllabus-topic canonicalization.
- The classifier remains a non-released question-text-foundation row-surface classifier; authoritative scoring taxonomy is not claimed.
- RAG proof covers deterministic question_plain_text_v2 rows in public.chunks and source attribution, not semantic retrieval-quality evaluation.
- Parent issue #389 should be updated or closed only after this PR merges and the orchestrator verifies final aggregate truth.

## Artifacts

- generator: `scripts/learning/run_9231_full_production_ready_aggregate_gate.js`
- machine gate: `docs/reports/2026-06-07-9231-full-production-ready-gate.json`
- markdown closeout: `docs/reports/2026-06-07-9231-full-production-ready-closeout.md`
