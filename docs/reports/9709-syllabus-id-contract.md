# 9709 syllabus topic tree schema and ID contract

Issue: #288
Parent tracker: #286
Predecessor: #287

## Scope

This freezes the schema and ID contract for a future canonical syllabus topic tree.
It does not generate a draft topic tree, extract boundary annotations, or approve a
baseline tree.

The machine-readable schema is:

- `data/contracts/9709_syllabus_topic_tree_schema_v1.json`

The contract is derived from the official-source workflow locked in issue `#287`.
For `9709`, the only baseline source for this stage is:

- Source document ID: `cambridge-9709-syllabus-2026-2027-v4`
- Exam years: `2026-2027`
- Syllabus version: `Version 4`, normalized as `2026-2027_v4`
- Official PDF: `https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf`
- SHA-256: `dd0131f3cd8d4e3c270e7936cbb909c15f4cb8053f8337b67c16e8ec0b8bc5e5`
- Local source inventory: `data/syllabus/9709/source_inventory.json`
- Raw extraction layer: `data/syllabus/9709/raw_sections_v1.json`

## Document Contract

A canonical topic tree document must carry:

- `schema_version`: currently `v1`
- `contract_id`: currently `9709_syllabus_topic_tree_schema_v1`
- `syllabus_code`: Cambridge subject code such as `9709`
- `syllabus_version`: normalized source version such as `2026-2027_v4`
- `exam_year_range`: source exam-year range such as `2026-2027`
- `source_lock`: official source identity, URL, SHA-256, and access date
- `nodes[]`: the syllabus/component/section/objective/note/boundary records

The schema is generic by subject code pattern instead of hard-coding `9709`, so the
same v1 shape can be reused for later `9231` or `9702` work. This issue only
authorizes the `9709` contract and source lock.

## Node Contract

Every node-like claim must include:

- `node_id`
- `parent_node_id`
- `topic_path`
- `canonical_title`
- `display_title`
- `component_code`
- `paper`
- `section_code`
- `node_type`
- `source_refs[]`
- `component_scope`
- `qualification_route_scope`
- `assumed_knowledge`
- `status`
- `review_state`
- `aliases[]`
- `legacy_paths[]`

Allowed `node_type` values are:

- `syllabus`
- `component`
- `section`
- `learning_objective`
- `note`
- `boundary`

Allowed lifecycle `status` values are:

- `draft`
- `approved`
- `deprecated`
- `needs_human_review`

An `approved` node must have `review_state.state = accepted`. A `deprecated` node
must have `review_state.state = deprecated`. Draft and review-needed records remain
explicitly separate from approved baseline truth.

## Durable ID Contract

`display_title` is not a durable ID and must not be used as a join key.

Durable IDs use this normalized shape:

```text
<syllabus_code>:<syllabus_version>:<node_type>[:<stable_slug_path>]
```

Examples:

```text
9709:2026-2027_v4:syllabus
9709:2026-2027_v4:component:p1
9709:2026-2027_v4:section:p1.quadratics
9709:2026-2027_v4:learning_objective:p1.quadratics.solve_equations
```

Rules:

- `node_id` is the durable machine identity.
- `display_title` is human-facing text and may change for readability.
- `canonical_title` is the normalized title for the node, but it is still not the
  durable join key.
- `topic_path` is an ordered slug breadcrumb for semantic mapping and review, not a
  substitute for `node_id`.
- `parent_node_id` links to another `node_id`, or is `null` only for root-level
  syllabus records.
- Node IDs must stay stable once approved. If a concept moves, use aliases,
  legacy paths, and deprecation records rather than silently changing the approved
  ID.

JSON Schema enforces the ID shape. Cross-record checks such as node ID uniqueness,
parent existence, and replacement-target existence should be enforced by the later
tree validator because draft-07 JSON Schema cannot express those graph constraints
cleanly.

## Source References

Every node-like claim must have at least one `source_refs[]` entry. This includes
nodes, aliases, legacy paths, and assumed-knowledge references.

A source reference records:

- `source_document_id`
- `source_type`
- `page_ref`
- `section_ref`
- `raw_section_id`
- `locator`

For canonical `9709` syllabus claims, `source_document_id` should normally point to
`cambridge-9709-syllabus-2026-2027-v4`, and `raw_section_id` should point into
`data/syllabus/9709/raw_sections_v1.json` when a raw section exists.

The schema also permits legacy and manual-audit source types for alias and
legacy-path records. Those records are mapping aids, not authority to promote
unofficial taxonomy as canonical syllabus truth.

## Scope Fields

`component_code` and `paper` identify the primary component/paper context for a
node when applicable. Root syllabus records can use `null`.

`component_scope[]` records all component/paper contexts where the claim applies.
This keeps cross-component syllabus concepts explicit without duplicating canonical
home objects.

`qualification_route_scope[]` records whether a claim applies to `AS Level`,
`A Level`, or both. Route scope is part of the review contract because later
question semantic mapping must know which syllabus route a node belongs to.

`assumed_knowledge[]` records upstream knowledge dependencies with their own
source references. It is for traceability and later mapping compatibility only; it
does not trigger question extraction in this epic.

## Legacy Alias Contract

`aliases[]` and `legacy_paths[]` exist so old taxonomy labels can later be mapped,
approved, or deprecated without changing canonical IDs.

They must not be used to promote old taxonomy paths directly into canonical truth.
Each alias or legacy path must carry `source_refs[]` and a status:

- `candidate`
- `approved`
- `deprecated`

This supports future migration from existing paths such as `9709.p1.integration`
while preserving the ability to mark them stale or unsafe.

## Question Mapping Compatibility

The schema supports later question semantic mapping by preserving durable node IDs,
topic breadcrumbs, component/paper scope, route scope, source references, assumed
knowledge, aliases, and legacy paths.

It deliberately does not include question extraction output, prompt output, VLM
surface evidence, or boundary annotation extraction. Those belong to later stages
and must join to the canonical tree through `node_id` or reviewed alias mapping.

## Validation

Focused schema tests live at:

- `tests/contracts/9709-syllabus-topic-tree-schema.test.js`

They cover:

- valid `9709` document shape
- required node fields
- rejection of display-title-shaped durable IDs
- invalid `status` and `review_state` values
- approved-node review gating
- future-compatible subject-code reuse

Run them with:

```bash
NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand tests/contracts/9709-syllabus-topic-tree-schema.test.js
```
