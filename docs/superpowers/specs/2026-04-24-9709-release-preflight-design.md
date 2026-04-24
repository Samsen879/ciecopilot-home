# 9709 Release Preflight Design

## Purpose

The 9709 authority-ready batch can now publish 300 audited questions, but the path that produced it required manual repair. This design adds a 9709-specific release preflight so future runs fail before publish when the same classes of defects recur.

The preflight does not replace VLM extraction, authority review, or registry backfill. It validates the artifacts those steps produce and writes a release-quality report that is both machine-readable and reviewable by an operator.

## Scope

This design is intentionally 9709-specific. It validates the `9709_authority_ready_batch_300_v1` manifest, authority sidecar, curriculum seed, and optional evidence bundles or lane output summaries. It does not generalize subject ingest for every syllabus.

## Blocking Checks

The preflight fails when any of these conditions is present:

- Manifest item count differs from the expected count, defaulting to 300.
- Any manifest item has `diagram_present` missing, `null`, or non-boolean.
- Manifest and authority sidecar cannot join 1:1 by `storage_key`.
- Any sidecar item is missing `authority_input_pack.canonical_primary_topic_path`.
- Any canonical topic path cannot be resolved by the configured 9709 curriculum seed.
- A historical paper-1 vector item is not canonicalized to `9709.p3.vectors` with legacy metadata.
- An OCR-empty item lacks an explicit acceptable status such as out-of-scope, asset failed, or manual review required.
- An image path is unresolved without an acceptable `WM_` fallback or explicit review reason.
- A ready-to-write artifact contains an item whose `overall_alignment_verdict` is not `ready`.

## Warning Checks

The preflight passes with warnings for these conditions:

- `diagram_present=true` but `diagram_elements` is empty.
- `diagram_present=true` but `spatial_evidence` is empty.
- Crop quality is suspicious but OCR is present.
- Paper 5 or Paper 6 content is present in the batch but the authority sidecar explicitly resolves it.
- Manifest `primary_topic_path` is missing while the sidecar provides canonical authority.

## Outputs

The CLI writes a JSON report with:

- `status`: `pass` or `fail`
- `blockers`: blocking findings with storage keys and reason codes
- `warnings`: non-blocking findings with storage keys and reason codes
- `counts`: manifest, sidecar, diagram, topic, and evidence summary counts

When requested, it also writes a Markdown report summarizing the same information for review.

Exit behavior:

- Non-zero when blockers exist.
- Zero when only warnings exist.
- Zero when no findings exist.

## Integration

The preflight is exposed as a reusable library and a CLI:

- `scripts/learning/lib/9709-release-preflight.js`
- `scripts/learning/run_9709_release_preflight.js`

`run_9709_authority_ready_batch.js` should call the library after building artifacts and before executing registry or analysis backfill steps. The first implementation may keep this behind a CLI flag if needed, but the release path should treat blockers as hard failures.

## Validation Strategy

Tests use small fixtures for failure modes and the published 300-row manifest as a passing fixture. The passing fixture is allowed to contain warnings for known partial `diagram_elements` coverage, but it must have no blockers.
