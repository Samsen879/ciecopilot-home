# 9709 Syllabus Baseline Freeze V1

Issue: #293

Parent tracker: #286

## Verdict

The approved canonical syllabus baseline v1 is frozen for Cambridge International AS & A Level Mathematics 9709, syllabus version `2026-2027_v4`.

This freeze is limited to the official-syllabus taxonomy and boundary overlay. It does not create downstream learning-runtime, mastery, recommendation, frontend, VLM, question extraction, or question semantic claims.

## Human Review Authority

- Decision artifact: `data/syllabus/9709/human_review_decisions_v1.json`
- Authority ID: `human-approval-2026-04-27-issue-293`
- Approval date: 2026-04-27
- Approval quote: `我同意，human review通过，以后所有需要human review的都默认通过，继续推进`
- Selection rule: recommended/default review-pack option where present; least-content-changing option only if no explicit recommendation exists.
- Carried unresolved review items: 0

## Approved Artifacts

- Topic tree: `data/syllabus/9709/canonical_topic_tree_v1.json`
- Boundary annotations: `data/syllabus/9709/boundary_annotations_v1.json`
- Human decisions: `data/syllabus/9709/human_review_decisions_v1.json`
- Gate report: `docs/reports/9709-syllabus-gate-report.json`

## Decision Application

| Review item | Selected option | Machine action |
| --- | --- | --- |
| `9709-review-001-repeated-section-title-merge-policy` | `keep_component_scoped_sections` | approve_component_scoped_nodes_with_optional_relationship_overlay |
| `9709-review-002-compound-objective-split-policy` | `approve_official_bullet_as_atomic` | approve_current_bullet_nodes_and_track_subskills_separately |
| `9709-review-003-p2-p3-subset-boundary` | `relationship_overlay_only` | approve_boundary_annotation_without_merging_nodes |
| `9709-review-004-p4-p6-component-conflict` | `approve_hard_route_constraint` | approve_no_p4_p6_combination_boundary |
| `9709-review-005-ocr-damaged-title-id-repair` | `repair_before_approval` | replace_noisy_titles_and_slugs_with_human_verified_text |
| `9709-review-006-unmapped-official-content-scope` | `approve_zero_unmapped_subject_bullets` | record_no_unmapped_subject_content_bullet_blocker |

## Approved Baseline Counts

- Topic nodes: 201
- Boundary annotations: 15
- Approved topic nodes without source_refs: 0
- Approved boundary annotations without source_refs: 0

## OCR Repair And Legacy Mapping

The naming/ID repair decision is applied only to representative OCR-damaged node IDs already listed in the review pack. The old IDs are not silently dropped; each is retained as a deprecated `legacy_path` on the repaired approved node.

| Deprecated draft ID | Approved ID | Mapping posture |
| --- | --- | --- |
| `9709:2026-2027_v4:learning_objective:p1.integration.lo01_u_o_n_f_d_d_i_e` | `9709:2026-2027_v4:learning_objective:p1.integration.lo01_understand_integration_as_the_reverse_process_of_differentiation` | deprecated legacy_path on repaired node |
| `9709:2026-2027_v4:learning_objective:p6.the_poisson_distribution.lo05_use_the_normal_distribution_with_continuity_15_correction` | `9709:2026-2027_v4:learning_objective:p6.the_poisson_distribution.lo05_use_the_normal_distribution_as_an_approximation_to_the_poisson_distribution` | deprecated legacy_path on repaired node |
| `9709:2026-2027_v4:learning_objective:p6.sampling_and_estimation.lo05_use_the_central_limit_appropriate_the_distribution_of` | `9709:2026-2027_v4:learning_objective:p6.sampling_and_estimation.lo05_use_the_central_limit_theorem_where_appropriate` | deprecated legacy_path on repaired node |

## Legacy Migration / Quarantine Notes

Legacy and candidate files remain non-authoritative. The source inventory continues to mark the legacy text and derived candidate files as deprecated or comparison-only material; the approved baseline does not cite them as `source_refs`.

| Legacy/candidate class | Freeze posture |
| --- | --- |
| `data/syllabus/9709syllabus.txt` | deprecated as source baseline; not canonical |
| `data/syllabus/9709_p1_p3_nodes_v1.json` | legacy non-authoritative candidate comparison only |
| `data/curriculum/9709_question_search_recovery_nodes_v1.json` | candidate comparison input only |
| `data/curriculum/9709_authority_ready_batch_300_nodes_v2.json` | candidate comparison input only |

## Gate Contract

The syllabus gate must be run as an approved-baseline attempt. It fails if approved nodes or boundary annotations lack human decision references, if review decisions are missing, if carried review items remain, if source_refs drift outside the locked official extraction layer, or if legacy files leak into canonical authority.

The checked-in gate report may retain non-blocking raw-section mapping warnings for front matter, syllabus context, MF19 formula/table material, and administrative sections outside the canonical topic tree. Review item `9709-review-006-unmapped-official-content-scope` approves that there are zero unmapped subject-content bullets while keeping MF19 outside this baseline.
