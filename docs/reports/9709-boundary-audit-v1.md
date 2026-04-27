# 9709 Boundary Audit v1

Issue: #290
Parent tracker: #286
Source: Cambridge International AS & A Level Mathematics 9709 syllabus, 2026-2027 version 4.

## Scope

This audit creates `data/syllabus/9709/boundary_annotations_draft_v1.json` as a draft boundary overlay for the locked official syllabus source. Boundary annotations remain separate from the canonical topic tree and only link to `node_id` values from `data/syllabus/9709/canonical_topic_tree_draft_v1.json` where the official source supports that link.

The draft does not approve boundary decisions, alter topic-tree nodes, add scheduler logic, or infer boundaries from legacy files, past papers, VLM outputs, or unofficial sources.

## Extracted Boundary Classes

- `assessment_scope`: compact P1-P6 component scope annotations from the syllabus content overview.
- `route_constraint`: AS-only and A Level route eligibility constraints, including the P1/P2 no-progression rule and the P4/P6 combination conflict.
- `assumed_knowledge`: course-entry prior knowledge and P6 dependencies on P5 plus P3 calculus.
- `excluded_knowledge`: explicit exclusions such as Paper 4 question papers not using vector notation.
- `component_only_coverage`: the P2/P3 alternative-route and subset relationship, preserved as review-needed rather than normalized.

## Human Review Flags

The following claims are intentionally marked `needs_human_review`:

- `9709:2026-2027_v4:boundary:route.no_p4_p6_combination`: component conflict and multi-column route-table extraction risk.
- `9709:2026-2027_v4:boundary:relationship.p2_subset_p3`: the official wording says Paper 2 is "largely a subset" of Paper 3, without a one-to-one mapping.

## Source Discipline

Every annotation has `source_refs` into `data/syllabus/9709/raw_sections_v1.json` and uses `source_type: official_syllabus`. The source lock points to `cambridge-9709-syllabus-2026-2027-v4` from `data/syllabus/9709/source_inventory.json`.

## Verification

Focused contract coverage is in `tests/contracts/9709-boundary-annotations-draft.test.js`. It checks:

- the JSON artifact and report exist;
- every annotation resolves to the locked official raw section layer;
- linked node IDs exist in the draft canonical topic tree;
- required boundary categories and all P1-P6 component scopes are represented;
- cross-component and review-needed claims are marked explicitly.
