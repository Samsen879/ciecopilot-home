# 9709 Wave A Manifest Selection Report

**Date:** 2026-04-19  
**Issue:** `#243`  
**Manifest:** `data/manifests/9709_question_search_expansion_wave_a_v1.json`

## Goal

Freeze a `30`-row Wave A manifest that stays inside the proven `9709` pilot scope, does not overlap the `17`-row recovery manifest, and already satisfies the fixed bucket, difficulty-band, and shard-composition rules before any tooling or live rerun work starts.

## Governing Sources

- `docs/reports/2026-04-19-9709-wave-a-github-issue-drafts.md`
- `docs/superpowers/plans/2026-04-19-9709-wave-a-controlled-expansion.md`
- `data/manifests/9709_question_search_recovery_v1.json`
- `data/eval/a1_topic_link_manual_audit_9709_p1p3_v1_review_sheet.csv`
- `data/eval/marking_eval_set_v2_blind_9709_p1p3.json`
- `data/eval/marking_eval_set_v3_hard_blind_9709_p1p3.json`

## Why These Three Buckets

- `9709.p1.trigonometry` was already part of the recovery slice and has enough reviewed non-overlap rows to support a full `10`-row Wave A bucket without reopening the topic boundary.
- `9709.p3.integration` was already part of the recovery slice and has enough reviewed non-overlap rows to support a mostly reviewed Wave A bucket, with one explicit hard blind-set row added for the `ocr_hard` band.
- `9709.p3.trigonometry` was already part of the recovery slice, but its non-overlap reviewed pool is too shallow to reach `10` rows safely. This is the only bucket that materially needs blind-set supplementation.

## Candidate Pool And Selection Policy

- The non-overlap reviewed pool from `a1_topic_link_manual_audit_9709_p1p3_v1_review_sheet.csv` contains `29` rows:
- `9709.p1.trigonometry = 12` reviewed rows (`10 correct`, `2 partial`)
- `9709.p3.integration = 12` reviewed rows (`7 correct`, `4 partial`, `1 wrong`)
- `9709.p3.trigonometry = 5` reviewed rows (`4 correct`, `1 wrong`)
- The recovery manifest overlap rule removes every storage key already present in `data/manifests/9709_question_search_recovery_v1.json`.
- Selection preference is: reviewed non-overlap correct rows first, reviewed partial rows only where they help fill the medium band, blind-set rows only when they add explicit hard coverage or are required to close the `p3.trigonometry` count gap.

## What Was Included And Excluded

- Included from the reviewed pool: `23` rows.
- Included from blind sets: `7` rows.
- `9709.p1.trigonometry` stays entirely inside the reviewed pool because reviewed coverage is already sufficient for all four difficulty bands.
- `9709.p3.integration` uses one blind-set row, `9709/w23_qp_32/questions/q09.png`, to occupy the `ocr_hard` band without using the reviewed wrong row.
- `9709.p3.trigonometry` uses `6` blind-set rows because the reviewed non-overlap pool has only `4` correct rows and the only remaining reviewed row is a wrong-topic candidate.
- Excluded reviewed rows include the two `p1` partials, the `p3.integration` wrong row `9709/m23_qp_32/questions/q08.png`, and the `p3.trigonometry` wrong row `9709/w22_qp_32/questions/q04.png`.

## Composition Summary

| Bucket | Clean | Medium | OCR Hard | Diagram/Review Heavy | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| `9709.p1.trigonometry` | 6 | 2 | 1 | 1 | 10 |
| `9709.p3.integration` | 6 | 2 | 1 | 1 | 10 |
| `9709.p3.trigonometry` | 6 | 2 | 1 | 1 | 10 |

| Shard | `p1.trigonometry` | `p3.integration` | `p3.trigonometry` | Total | Design Role |
| --- | ---: | ---: | ---: | ---: | --- |
| `shard_1` | 4 | 3 | 3 | 10 | clean-first validation shard; no `ocr_hard` or `diagram_review_heavy` |
| `shard_2` | 3 | 4 | 3 | 10 | mixed extraction shard; introduces all `ocr_hard` rows |
| `shard_3` | 3 | 3 | 4 | 10 | stress shard; contains all `diagram_review_heavy` rows and late medium rows |

## Gate-Critical Policy

- Exactly `9` rows are marked `gate_critical=true`.
- The gate-critical set is one row per bucket per shard.
- This keeps future full-review and probe-fixture work aligned with the later `9`-case Wave A probe contract instead of creating an oversized gate-critical set that cannot fit the downstream fixture rules.

## Descriptor Policy

- All `30` rows are marked `descriptor_required=true`.
- Wave A exists to expand searchable single-question coverage, so every admitted row is expected to produce descriptor-bearing output rather than treating descriptor quality as optional.

## `paper_scope_key` Convention

`paper_scope_key` is frozen as:

```text
<syllabus_code>:<year>:<session>:p<paper>:v<variant>:q<zero-padded-q_number>
```

Examples:

- `9709:2024:m:p1:v2:q04`
- `9709:2023:w:p3:v2:q09`

This key is a deterministic single-question identity. It does not replace the structured paper fields. The expected projection mapping is direct:

- manifest `paper = 1` should hydrate to projection `paper_number = 1`
- manifest `paper = 3` should hydrate to projection `paper_number = 3`
- `variant` and `q_number` remain explicit manifest fields and are preserved independently of the composite key

## Shard Assignments

### `shard_1`

| Storage Key | Bucket | Difficulty | Source | Gate Critical | Why This Shard |
| --- | --- | --- | --- | --- | --- |
| `9709/s17_qp_11/questions/q03.png` | `9709.p1.trigonometry` | `clean` | `manual_audit_non_overlap_correct` | no | clean reviewed proof anchor for early p1 validation |
| `9709/s23_qp_11/questions/q01.png` | `9709.p1.trigonometry` | `clean` | `manual_audit_non_overlap_correct` | no | clean reviewed equation solve row |
| `9709/w16_qp_12/questions/q02.png` | `9709.p1.trigonometry` | `clean` | `manual_audit_non_overlap_correct` | no | clean angle-solving row with routine OCR posture |
| `9709/w23_qp_11/questions/q05.png` | `9709.p1.trigonometry` | `medium` | `manual_audit_non_overlap_correct` | yes | medium algebraic reformulation row closes the first p1 shard |
| `9709/s16_qp_32/questions/q03.png` | `9709.p3.integration` | `clean` | `manual_audit_non_overlap_correct` | no | clean exact definite integral anchor |
| `9709/s17_qp_33/questions/q04.png` | `9709.p3.integration` | `clean` | `manual_audit_non_overlap_correct` | yes | clean exact integral row chosen as the shard-1 p3 integration gate pin |
| `9709/s18_qp_31/questions/q05.png` | `9709.p3.integration` | `medium` | `manual_audit_non_overlap_partial` | no | medium substitution-plus-identity blend kept out of shard 2 hard load |
| `9709/m19_qp_32/questions/q03.png` | `9709.p3.trigonometry` | `clean` | `manual_audit_non_overlap_correct` | no | clean reviewed exact-solution anchor |
| `9709/w21_qp_32/questions/q06.png` | `9709.p3.trigonometry` | `clean` | `blind_eval_v2_topic_match` | no | supplemental clean row needed because reviewed p3 trigonometry coverage is short |
| `9709/m20_qp_32/questions/q05.png` | `9709.p3.trigonometry` | `medium` | `manual_audit_non_overlap_correct` | yes | medium proof-plus-equation row serves as the shard-1 p3 trigonometry gate pin |

### `shard_2`

| Storage Key | Bucket | Difficulty | Source | Gate Critical | Why This Shard |
| --- | --- | --- | --- | --- | --- |
| `9709/s17_qp_13/questions/q05.png` | `9709.p1.trigonometry` | `clean` | `manual_audit_non_overlap_correct` | no | clean reviewed identity solve row before the p1 hard case |
| `9709/w16_qp_13/questions/q03.png` | `9709.p1.trigonometry` | `clean` | `manual_audit_non_overlap_correct` | no | clean quadratic trig solve row |
| `9709/m24_qp_12/questions/q04.png` | `9709.p1.trigonometry` | `ocr_hard` | `manual_audit_non_overlap_correct` | yes | reviewed dense proof-plus-solve row chosen as the p1 OCR-hard case |
| `9709/s18_qp_32/questions/q04.png` | `9709.p3.integration` | `clean` | `manual_audit_non_overlap_correct` | no | clean identity-to-integral bridge row |
| `9709/s24_qp_32/questions/q07.png` | `9709.p3.integration` | `clean` | `manual_audit_non_overlap_correct` | no | clean symmetric-interval integral row |
| `9709/w20_qp_32/questions/q09.png` | `9709.p3.integration` | `clean` | `manual_audit_non_overlap_correct` | no | clean partial-fractions integral row |
| `9709/w23_qp_32/questions/q09.png` | `9709.p3.integration` | `ocr_hard` | `blind_eval_v3_hard_topic_match` | yes | hard blind-set row supplies explicit OCR-hard coverage without using the reviewed wrong candidate |
| `9709/m24_qp_32/questions/q08.png` | `9709.p3.trigonometry` | `clean` | `manual_audit_non_overlap_correct` | no | clean reviewed `R sin(x + alpha)` solve row |
| `9709/w22_qp_32/questions/q06.png` | `9709.p3.trigonometry` | `clean` | `blind_eval_v2_topic_match` | no | supplemental clean row needed to reach the p3 trigonometry target count |
| `9709/w23_qp_32/questions/q07.png` | `9709.p3.trigonometry` | `ocr_hard` | `blind_eval_v3_hard_topic_match` | yes | hard blind-set row chosen as the p3 trigonometry OCR-hard case |

### `shard_3`

| Storage Key | Bucket | Difficulty | Source | Gate Critical | Why This Shard |
| --- | --- | --- | --- | --- | --- |
| `9709/s21_qp_13/questions/q04.png` | `9709.p1.trigonometry` | `clean` | `manual_audit_non_overlap_correct` | no | clean late-shard identity anchor |
| `9709/s18_qp_13/questions/q07.png` | `9709.p1.trigonometry` | `medium` | `manual_audit_non_overlap_correct` | no | graph/intersection row retained as late medium stress |
| `9709/s22_qp_13/questions/q02.png` | `9709.p1.trigonometry` | `diagram_review_heavy` | `manual_audit_non_overlap_correct` | yes | explicit sine-curve diagram read; natural p1 diagram-heavy case |
| `9709/w21_qp_33/questions/q09.png` | `9709.p3.integration` | `clean` | `manual_audit_non_overlap_correct` | no | clean application/integration anchor for the final shard |
| `9709/w19_qp_32/questions/q08.png` | `9709.p3.integration` | `medium` | `manual_audit_non_overlap_partial` | no | medium logarithmic partial-fractions row held for late stress |
| `9709/s24_qp_32/questions/q06.png` | `9709.p3.integration` | `diagram_review_heavy` | `manual_audit_non_overlap_correct` | yes | curve maximum plus shaded-area style surface makes this the natural p3 integration diagram-heavy case |
| `9709/s17_qp_32/questions/q03.png` | `9709.p3.trigonometry` | `clean` | `manual_audit_non_overlap_correct` | no | clean reviewed transformed-equation row |
| `9709/w22_qp_32/questions/q09.png` | `9709.p3.trigonometry` | `clean` | `blind_eval_v2_topic_match` | no | supplemental clean row needed to close the bucket count |
| `9709/w21_qp_32/questions/q07.png` | `9709.p3.trigonometry` | `medium` | `blind_eval_v2_topic_match` | no | supplemental medium row used because reviewed p3 trigonometry coverage is insufficient |
| `9709/w22_qp_32/questions/q07.png` | `9709.p3.trigonometry` | `diagram_review_heavy` | `blind_eval_v3_hard_topic_match` | yes | review-heavy symbolic hard row occupies the bucket’s diagram/review-heavy band because the non-overlap p3 trigonometry pool is dense-symbolic rather than graph-led |

## Intentional Hard Rows

| Storage Key | Bucket | Band | Why It Is Intentionally Hard |
| --- | --- | --- | --- |
| `9709/m24_qp_12/questions/q04.png` | `9709.p1.trigonometry` | `ocr_hard` | dense proof-plus-equation row with notation-heavy trig surface |
| `9709/s22_qp_13/questions/q02.png` | `9709.p1.trigonometry` | `diagram_review_heavy` | explicit sine-curve diagram read rather than pure symbolic solving |
| `9709/w23_qp_32/questions/q09.png` | `9709.p3.integration` | `ocr_hard` | hard blind-set integration application row added specifically for the OCR-hard band |
| `9709/s24_qp_32/questions/q06.png` | `9709.p3.integration` | `diagram_review_heavy` | maximum-point plus area-under-curve surface raises diagram/context burden |
| `9709/w23_qp_32/questions/q07.png` | `9709.p3.trigonometry` | `ocr_hard` | hard blind-set trig row with explicit noisy-alignment provenance |
| `9709/w22_qp_32/questions/q07.png` | `9709.p3.trigonometry` | `diagram_review_heavy` | intentionally review-heavy symbolic row used because this bucket lacks enough non-overlap graph-led candidates |

## Gate-Critical Inventory

| Storage Key | Bucket | Shard | Band |
| --- | --- | --- | --- |
| `9709/w23_qp_11/questions/q05.png` | `9709.p1.trigonometry` | `shard_1` | `medium` |
| `9709/m24_qp_12/questions/q04.png` | `9709.p1.trigonometry` | `shard_2` | `ocr_hard` |
| `9709/s22_qp_13/questions/q02.png` | `9709.p1.trigonometry` | `shard_3` | `diagram_review_heavy` |
| `9709/s17_qp_33/questions/q04.png` | `9709.p3.integration` | `shard_1` | `clean` |
| `9709/w23_qp_32/questions/q09.png` | `9709.p3.integration` | `shard_2` | `ocr_hard` |
| `9709/s24_qp_32/questions/q06.png` | `9709.p3.integration` | `shard_3` | `diagram_review_heavy` |
| `9709/m20_qp_32/questions/q05.png` | `9709.p3.trigonometry` | `shard_1` | `medium` |
| `9709/w23_qp_32/questions/q07.png` | `9709.p3.trigonometry` | `shard_2` | `ocr_hard` |
| `9709/w22_qp_32/questions/q07.png` | `9709.p3.trigonometry` | `shard_3` | `diagram_review_heavy` |

## Honest Limits

- This issue freezes the manifest only. It does not yet freeze `route_hint`, surface flags, or final probe-fixture membership.
- The `diagram_review_heavy` band in `9709.p3.trigonometry` is satisfied by a review-heavy symbolic hard row rather than a literal graph-led row because the non-overlap candidate pool in that bucket is materially thinner than the other two buckets.
- Any later attempt to widen the bucket set, substitute reviewed wrong-topic rows, or backfill extra rows outside this manifest would violate the Wave A freeze and must be treated as new work, not as part of `#243`.
