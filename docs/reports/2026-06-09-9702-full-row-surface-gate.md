# 9702 full row-surface gate

- generated_on: `2026-06-09`
- gate_status: `passed`
- scope: `row-surface/crop readiness only`
- production_ready_claimed: `false`
- external VLM/API calls: `0`
- DB/search/read-model/RAG writes: `0`

## Counts

- phase1_source_pdf_count: `362`
- source_pdf_count_with_accepted_rows: `362`
- accepted_rows: `4137`
- duplicate_storage_key_q_number_rows: `0`
- unpromoted_missing_candidate_count: `73`
- unpromoted_ambiguous_candidate_count: `0`
- rejected_false_positive_candidate_count: `13829`
- boundary_remediation_count: `1`
- blocker_count: `0`

## Artifacts

- full_row_surface_manifest: `data/manifests/9702_full_row_surface_2026_06_09_manifest_v1.json`
- full_crop_manifest: `data/manifests/9702_full_crop_manifest_2026_06_09_v1.json`
- shard_manifest_count: `25`
- shard_closeout_count: `25`

## Boundary

This gate records deterministic row-surface and crop/render evidence only. It does not claim visual acceptance, normalized text, authority alignment, local consumption, production writes, or production readiness.
