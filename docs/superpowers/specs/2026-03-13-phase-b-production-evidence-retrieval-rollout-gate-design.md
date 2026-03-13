# Phase B Production Evidence Retrieval Rollout Gate Design

Date: 2026-03-13
Scope: backend RAG only
Status: implemented-and-validated

## Goal

Add an explicit opt-in retrieval rollout gate so `production_evidence` stays blocked from online retrieval by default, but a specific ready-for-ingest bundle and subject can be deliberately promoted into retrieval without touching frontend code or database schema.

## Locked Context

- The ready-ingest pilot bundle already exists and has passed governance preflight, live write, and post-write audit.
- Retrieval already defaults to excluding `evidence_authored` / `evidence_transformed` / `evidence_reserved`.
- The next slice is not “turn everything on”. It is “make promotion explicit, narrow, and auditable”.

## Design

The rollout gate is a checked-in JSON file at `data/evidence/production/rollout_gate_v1.json`.

Each entry binds together:

- one whitelisted `bundle_id`
- one `manifest_path`
- one subject scope and subject code list
- one `rollout_state`
- one or more approved production evidence `corpus_versions`
- one allowed source type list

The runtime remains default-off:

- if the gate file is missing, retrieval stays blocked
- if the subject does not match, retrieval stays blocked
- if the matching entry is still `offline_default`, retrieval stays blocked
- if no baseline `RAG_CORPUS_VERSIONS` allowlist is configured, retrieval stays blocked
- if a rollout-gated production evidence corpus version is accidentally present in the baseline allowlist, runtime strips it back out until promotion

Only when all of those conditions are satisfied does the runtime:

- merge the gate-approved production evidence corpus version into `p_corpus_versions`
- remove the gate-approved evidence source types from the per-request exclusion list
- leave all non-matching subjects and non-promoted bundles blocked

## Why Corpus-Version Opt-In Is The Primary Control

The safest promotion mechanism is not “allow all authored evidence rows”. It is “allow only the corpus versions that were explicitly approved for this promoted bundle”.

That keeps the rollout tied to:

- a known bundle
- a known ingest run lineage
- a known subject scope

This is also compatible with the existing RPC path, which already accepts `p_corpus_versions`.

## Contract Rules

The rollout gate validator enforces:

- `manifest_role = production_evidence_rollout_gate`
- `default_retrieval_state = blocked`
- every entry must match a whitelist entry
- every entry must point at a `ready_for_ingest` whitelist entry
- every entry `corpus_versions` set must match the whitelist-approved corpus versions
- every entry must keep `ingest_allowed = true`
- every entry must keep `release_ready_expected = true`
- `subject_scope`, `subject_codes`, and `allowed_source_types` must match the whitelist entry as sets, not as ordered lists
- checked-in gate can remain entirely offline by setting `rollout_state = offline_default`

## Runtime Rules

Runtime config adds:

- `RAG_PRODUCTION_EVIDENCE_ROLLOUT_ENABLED`
- `RAG_PRODUCTION_EVIDENCE_ROLLOUT_GATE_PATH`
- `RAG_PRODUCTION_EVIDENCE_ROLLOUT_REQUIRE_BASE_CORPUS_VERSIONS`

Runtime resolution adds:

- subject-aware gate matching
- per-request corpus allowlist merge
- per-request exclusion relaxation for promoted evidence types only
- fail-closed behavior when the gate is missing or when baseline allowlist preconditions are not met
- route audit annotations for whether rollout was active and why

## Non-Goals

- no frontend exposure
- no `supabase/migrations/*.sql` changes
- no default online activation for all production evidence
- no promotion of `note_md` / `data-notes`
- no mixing of `restricted_official` with `production_evidence`
