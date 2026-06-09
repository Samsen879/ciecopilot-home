# 9702 w17 qp21 q07 boundary remediation

- generated_on: `2026-06-09`
- issue: `#420`
- parent: `#402`
- blocks: `#407`
- production_ready_claimed: `false`

## Blocker Preserved

#407 Phase 5 visual review rejected `9702/w17_qp_21/questions/q07.png` with VLM response `chatcmpl-249bcabb-e6c4-940b-895a-9c28622a2573`: `Third image shows Q8, not part of Q7; wrong boundary.`

The rejected state remains preserved in `stash@{0}: wip-407-visual-review-blocked-9702-w17-qp21-q07-rejected`. This remediation does not erase or reinterpret that Phase 5 blocker.

## Correction

- source_pdf: `data/past-papers/9702Physics/paper2/9702_w17_qp_21.pdf`
- storage_key: `9702/w17_qp_21/questions/q07.png`
- q_number: `7`
- previous_page_numbers: `[14, 15, 16]`
- corrected_page_numbers: `[14, 15]`
- excluded_page_numbers: `[16]`
- removed stale crop: `data/crops/9702-full-scaleout/question-crops/9702_w17_qp_21/q07/q07_page_016.png`

The row identity remains stable. The corrected q07 row now carries `boundary_remediation` metadata in the shard, aggregate row-surface, and aggregate crop manifests.

## Gate Result

Command:

```bash
/home/samsen/code/ciecopilot-home/.venv/bin/python scripts/vlm/build_9702_full_row_surface_crop_gate_v1.py
```

Summary:

- row_gate_status: `passed`
- crop_gate_status: `passed`
- accepted_rows: `4137`
- duplicate_storage_key_q_number_rows: `0`
- row_identity_multiple_manifest_count: `0`
- manifest_membership_duplicate_count: `0`
- crop_rows_complete: `4137`
- missing_crop_files: `0`
- missing_rendered_pages: `0`
- boundary_remediation_count: `1`
- blocker_count: `0`
- production_ready_claimed: `false`

## Count Impact

- accepted_rows: `4137 -> 4137`
- crop_image_paths: `6686 -> 6685`
- rendered_page_paths_referenced_by_rows: `5058 -> 5057`
- boundary_remediation_count: `0 -> 1`

## Boundary

This is only the #420 q07 row-surface/crop boundary remediation needed before #407 can resume. It does not claim #407 visual acceptance, generate v1/v2 normalized text, do authority alignment, write DB/search/read-model/RAG surfaces, or claim all-9702 production readiness.
