# 9709 Wave A Surface Audit Report

**Date:** 2026-04-19  
**Issue:** `#245`  
**Manifest:** `data/manifests/9709_question_search_expansion_wave_a_v1.json`  
**Probe Fixture:** `data/eval/question_search_gold_9709_wave_a_v1.json`

## Goal

Freeze Wave A surface truth against the actual single-question assets before any shard execution, then derive the final `9`-case probe fixture from the post-audit manifest only.

## Evidence Precedence Used For This Audit

When sources disagreed, the audit used this order:

1. `data/eval/a1_topic_link_manual_audit_9709_p1p3_v1_review_sheet.csv`
2. `data/learning_runtime/release_evidence/released-family-gate-contract.v1.json`
3. local primary-asset inspection of the checked-in PNG question screenshots
4. blind-set step text from `marking_eval_set_v2_blind_9709_p1p3.json` and `marking_eval_set_v3_hard_blind_9709_p1p3.json` only as supporting evidence when no stronger checked-in source existed

That precedence mattered because several blind-set topic labels conflict with stronger checked-in audit truth on overlapping storage keys. The audit therefore treated blind-set topic labels as non-canonical whenever a reviewed manual row or released-family sample already existed for the same question.

## Surface Freeze Outcome

- `30/30` manifest rows now resolve `diagram_present`, `formula_dense`, `table_heavy`, `ocr_risk`, and `surface_evidence_status`.
- `30/30` rows now carry a frozen `route_hint`.
- `surface_evidence_status` is `verified_primary_asset` for all `30` rows.
- `table_heavy=true` was not supported by any audited Wave A row, so every row is frozen with `table_heavy=false`.

## Frozen `route_hint` Distribution

| Route | Rows | Why |
| --- | ---: | --- |
| `ocr_lane` | 24 | default for clean or medium text-first rows and non-diagram rows whose formulas still remain OCR-readable |
| `diagram_lane` | 2 | reserved for the real graph / area-under-curve surfaces |
| `review_lane` | 4 | reserved for explicitly justified hard symbolic/application rows only |

These counts describe the frozen manifest `route_hint` values. Materialized job plans still expand to `9` review-lane jobs because `gate_critical=true` remains a stronger router override than the advisory `route_hint`.

Diagram-lane rows:

- `9709/s22_qp_13/questions/q02.png`
- `9709/s24_qp_32/questions/q06.png`

Intentional review-lane rows:

- `9709/m24_qp_12/questions/q04.png`
  `Dense identity-proof-plus-solve row packs multiple symbolic transitions into one surface, so extraction-first OCR alone is not stable enough for the hard p1 gate pin.`
- `9709/w23_qp_32/questions/q09.png`
  `Hard blind-row evidence mixes application context, turning-point reasoning, and signed area interpretation, so the hard integration slot needs explicit review posture instead of OCR-only extraction.`
- `9709/w23_qp_32/questions/q07.png`
  `Hard blind trig row compresses triple-angle identity work and noisy symbolic alignment into one surface, so explicit review posture is safer than OCR-only routing.`
- `9709/w22_qp_32/questions/q07.png`
  `This intentionally review-heavy symbolic identity row has no literal diagram, but the retained hard slot still needs manual review posture because equivalence checking is denser than extraction-first OCR alone.`

## Hard-Row Inventory

| Storage Key | Bucket | Band | Frozen Route |
| --- | --- | --- | --- |
| `9709/m24_qp_12/questions/q04.png` | `9709.p1.trigonometry` | `ocr_hard` | `review_lane` |
| `9709/s22_qp_13/questions/q02.png` | `9709.p1.trigonometry` | `diagram_review_heavy` | `diagram_lane` |
| `9709/w23_qp_32/questions/q09.png` | `9709.p3.integration` | `ocr_hard` | `review_lane` |
| `9709/s24_qp_32/questions/q06.png` | `9709.p3.integration` | `diagram_review_heavy` | `diagram_lane` |
| `9709/w23_qp_32/questions/q07.png` | `9709.p3.trigonometry` | `ocr_hard` | `review_lane` |
| `9709/w22_qp_32/questions/q07.png` | `9709.p3.trigonometry` | `diagram_review_heavy` | `review_lane` |

## Candidate-Set Correction

The pre-audit Wave A manifest contained one row that could not stay in scope after applying checked-in evidence precedence:

- Removed from the pre-audit candidate set: `9709/w21_qp_32/questions/q07.png`
  The reviewed manual audit sheet classifies this storage key as `9709.p3.differential_equations`, and the released-family gate contract already uses the same question as a released `9709.differential_equations.separable` sample. That evidence is stronger than the blind-set trigonometry label used in the pre-audit selection report.

To preserve the frozen Wave A shape without widening scope:

- Added to the final post-audit manifest: `9709/w22_qp_32/questions/q04.png`
  This is the remaining non-overlap manually reviewed `9709.p3.trigonometry` row. Its original review-sheet verdict was `wrong` because the topic-link prediction only fell back to paper scope, not because the question itself is outside the trigonometry bucket. That makes it narrower and safer than retaining a released differential-equations row inside the p3-trigonometry Wave A slice.

This report supersedes the pre-audit selection report for the p3-trigonometry `shard_3` medium slot only.

## Rows Reassigned Across Shards

None.

The corrected p3-trigonometry medium replacement stayed in `shard_3`, so the frozen shard composition remains `10 / 10 / 10`, `shard_1` still contains no `ocr_hard` or `diagram_review_heavy` rows, and all `diagram_review_heavy` rows still remain in `shard_3`.

## Final Probe Fixture

The final probe fixture is the exact `gate_critical=true` set from the post-audit manifest. No extra rows were needed because the gate-critical inventory already satisfies the downstream `9`-case and `3 / 3 / 3` bucket-balance contract.

Post-audit manifest digest:

```text
3332454c981179e317988b45f847b47afb5c658226167344b782504909d8061b
```

Fixture composition:

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

## Audit Summary

- final route freeze: `ocr_lane=24`, `review_lane=4`, `diagram_lane=2`
- final surface counts: `diagram_present=true` on `2` rows, `formula_dense=true` on `23` rows, `table_heavy=true` on `0` rows
- final OCR-risk split: `low=6`, `medium=18`, `high=6`
- candidate-set delta: remove `9709/w21_qp_32/questions/q07.png`, add `9709/w22_qp_32/questions/q04.png`
- shard reassignment delta: none
- probe fixture: `9` rows, all gate-critical, balanced `3 / 3 / 3` across the three Wave A buckets
