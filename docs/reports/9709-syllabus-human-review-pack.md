# 9709 syllabus human review pack

Issue: #292
Parent tracker: #286
Reusable by: #293

## Verdict

This pack reduces the 9709 canonicalization review surface to six human decisions.
It does not approve or freeze a baseline.

Machine-readable decisions live in:

- `data/syllabus/9709/review_items_v1.json`

Source inputs:

- `data/syllabus/9709/source_inventory.json`
- `data/syllabus/9709/raw_sections_v1.json`
- `data/syllabus/9709/canonical_topic_tree_draft_v1.json`
- `data/syllabus/9709/boundary_annotations_draft_v1.json`
- `docs/reports/9709-syllabus-gate-report.json`

## Review policy

Humans should not re-audit every low-risk extracted item. This queue excludes:

- 122 draft topic nodes that do not require human judgment before approval review.
- 13 draft boundary claims without review reasons.
- 155 mapped subject-content bullets already covered by the draft tree.

The queue includes only grouped decisions that affect durable IDs, component
semantics, route constraints, split/merge policy, or official content scope.

## Human queue

| Item | Category | Decision | Risk |
| --- | --- | --- | --- |
| `9709-review-001-repeated-section-title-merge-policy` | merge/split candidate | Keep repeated section titles component-scoped, merge them into shared concepts, or defer them. | high |
| `9709-review-002-compound-objective-split-policy` | merge/split candidate | Approve official bullets as atomic nodes, split compound bullets before approval, or partition noisy cases. | high |
| `9709-review-003-p2-p3-subset-boundary` | ambiguous boundary | Represent P2 as "largely a subset" of P3 as an overlay, explicit subset links, or a blocker. | high |
| `9709-review-004-p4-p6-component-conflict` | component conflict | Approve the P4/P6 unavailable combination as a hard route constraint, downgrade it, or hold for table confirmation. | high |
| `9709-review-005-ocr-damaged-title-id-repair` | naming/ID issue | Repair OCR-damaged titles and IDs before approval, repair display text only, or hold noisy rows. | high |
| `9709-review-006-unmapped-official-content-scope` | unmapped official bullets | Confirm zero unmapped subject-content bullets and decide whether MF19 remains outside the topic tree. | medium |

## Recommended path

Use the recommended option in the JSON for each item unless the reviewer has a
specific syllabus-authority reason to choose otherwise:

- Keep repeated section titles component-scoped and add relationship metadata later.
- Approve official subject-content bullets as atomic syllabus nodes; treat subskills
  as downstream mapping aids.
- Keep the P2/P3 subset statement as a boundary overlay, not a silent node merge.
- Approve the P4/P6 unavailable combination as a hard route constraint.
- Repair noisy titles and durable IDs before any approved baseline uses them.
- Treat subject-content bullet coverage as complete; leave MF19 formula/table rows
  outside this topic-tree approval.

## Downstream use

Issue #293 can consume `review_items_v1.json` directly. Each item carries:

- `recommended_options[]` with machine actions.
- official `source_refs[]` anchored in the locked raw section layer.
- `risk_level`.
- `downstream_impact`.
- `decision.status = "pending"` and `decision.reusable_by_issue = 293`.

When humans choose options, #293 should update the decision fields or create a
derived approval artifact. It should not infer approval from this pack alone.
