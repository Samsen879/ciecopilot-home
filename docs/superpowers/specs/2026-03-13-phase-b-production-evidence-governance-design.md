# Phase B Production Evidence Governance Design

Date: 2026-03-13
Scope: backend RAG only
Status: approved-by-default-direction

## Goal

Establish the first-pass governance skeleton for the `production_evidence` layer without mixing it with `restricted_official`, without promoting `note_md`, and without attaching the new layer to the live retrieval path yet.

## Locked Boundaries

- `restricted_official` remains a separate internal official corpus layer for mapping, coverage, audit, and eval workflows.
- `production_evidence` is a distinct future-facing layer for authored / transformed product-safe evidence.
- `note_md` and `src/data/data-notes` remain non-production evidence.
- This phase does not modify `supabase/migrations/*.sql`.
- This phase does not add frontend integration.
- This phase does not claim user-facing/public redistribution clearance for official PDFs.

## First-Pass Design

### 1. New Policy Mode

Introduce a new offline policy mode named `production_evidence`.

This mode is not an alias for `restricted_official` and is not a rename of historical `production`.

The mode defines:

- `enabled_source_types`: `evidence_authored`, `evidence_transformed`
- `allowed_source_types`: exactly the enabled set above
- `reserved_source_types`: `evidence_reserved`
- `disallowed_source_types`: `note_md`, `past_paper_pdf`, `mark_scheme_pdf`

The reserved slot exists in governance metadata only. It is not whitelisted for ingest, manifest activation, or release in v1.

### 2. Manifest Contract

Define a dedicated manifest schema for `production_evidence` bundles.

The manifest must declare:

- layer identity: `evidence_layer = production_evidence`
- policy identity: `policy_mode = production_evidence`
- restricted-official posture: `restricted_official_posture = internal_context_only`
- versioning: manifest version, bundle id, generated timestamp
- scope: subject codes, subject scope, language
- source typing: declared / enabled / allowed / reserved source types
- manifest-to-items linkage: `items_file`, `bundle_item_count`
- provenance: authoring method, transformation method, upstream origin class, upstream refs
- review status: draft / reviewed / approved
- item list: stable ids, titles, topic paths, source type, provenance, review fields

The v1 item provenance contract is explicit:

- `evidence_authored` items must use `provenance.method = authored`
- `evidence_authored` items must use `provenance.upstream_source_class = none`
- `evidence_authored` items must use an empty `provenance.upstream_refs`
- `evidence_transformed` items must use `provenance.method = transformed`
- `evidence_transformed` items must use `provenance.upstream_source_class = restricted_official_context`
- `evidence_transformed` items must declare one or more `provenance.upstream_refs`
- each transformed upstream ref may point only to `past_paper_pdf` or `mark_scheme_pdf`
- each transformed upstream ref must use `usage = provenance_context`

This contract is what keeps `restricted_official` as provenance context only, not active evidence inside the new layer.

The manifest must reject:

- `note_md`
- `src/data/data-notes` and any `data-notes` upstream path
- `past_paper_pdf`
- `mark_scheme_pdf`
- any transformed item that uses upstream refs as active evidence instead of provenance context
- any activation of the reserved source type through item data or manifest metadata
- any bundle that omits the explicit `restricted_official` non-public posture field
- use of the reserved source type in active items

### 3. Offline Validator

Add an offline validator/audit runner for `production_evidence` manifests.

The validator should check:

- schema completeness
- source type whitelist compliance
- manifest `items_file` / `bundle_item_count` linkage is internally consistent
- reserved slot is declared but not active in metadata or items
- `restricted_official` references are kept in `provenance.upstream_refs` with `usage = provenance_context`, not active evidence items
- `note_md` / `data-notes` cannot appear as active evidence or provenance-origin inputs
- item provenance and review status are present
- subject scope metadata is internally consistent

The output should be both JSON and Markdown so the layer can be reviewed in CI-like workflows before any later ingest step exists.

### 4. Minimal Seed Artifact

Create one tiny checked-in seed bundle used only to validate the governance path.

The seed should:

- stay offline
- contain a minimal number of items
- use only `evidence_authored` and/or `evidence_transformed`
- be explicitly labeled as a governance seed, not a production-ready corpus

This is a test sample for the box, not the start of a large hand-authored data project.

### 5. Runbook

Add a short runbook that explains:

- what `production_evidence` is
- what it is not
- which source types are enabled now
- why the reserved slot exists
- how to validate a bundle
- what future Phase B content work must respect

## Non-Goals For This Slice

- no live retrieval integration
- no database schema changes
- no large-scale manual evidence authoring
- no benchmark rerouting to the new layer
- no conversion of official PDFs into public production evidence

## Why This Slice First

This keeps Phase B aligned with the agreed order:

1. define the box
2. validate the box with a tiny seed
3. only then decide what real content should go into the box

That order preserves clean governance and avoids another dirty dual-track setup.
