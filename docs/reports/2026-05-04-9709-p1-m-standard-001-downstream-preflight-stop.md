# 9709 p1_m_standard_001 downstream preflight stop

## Scope

本报告记录 `p1_m_standard_001` 在 post-extraction review 通过之后，进入 analysis/backfill/search/classifier/release gate 前的下游 preflight 结果。

当前结论不是 production-ready。post-extraction review 已经通过，但 authority/registry 前置条件还没有满足，因此不能继续做受管 analysis backfill，也不能宣称 search/classifier/release gate 通过。

## Current Passed Gate

- post-extraction review: `pass`
- manifest items: `85`
- evidence bundle items: `85`
- human disposition items: `47`
- blockers: `0`
- warnings: `0`
- remaining human review items: `0`
- accepted human dispositions: `47`

Evidence:

- `docs/reports/2026-05-04-9709-p1-m-standard-001-post-extraction-review.json`
- `docs/reports/2026-05-04-9709-p1-m-standard-001-human-visual-dispositions.json`

## Registry / Authority Preflight

Read-only local DB preflight against `question_bank` found:

- manifest items: `85`
- existing local `paper_question` rows: `30`
- existing rows with active snapshot: `30`
- missing local `paper_question` rows: `55`

The supported registry backfill runner was checked with:

```bash
node scripts/learning/run_paper_question_registry_backfill.js \
  --manifest data/manifests/9709_p1_m_standard_001_page_chain_surface_v1.json \
  --dry-run
```

It stopped immediately with:

```text
Manifest item 9709/m16_qp_12/questions/q01.png is missing primary_topic_path.
```

This is a real contract blocker. Both `data/manifests/9709_p1_m_standard_001_page_chain_surface_v1.json` and the matching `p1_m_standard_001` slice in `data/manifests/9709_full_scaleout_manifest_v1.json` currently have:

- `primary_topic_path` present: `0/85`
- `analysis_hints.topic_path_hint` present: `0/85`

No shard-specific authority sidecar was found for `p1_m_standard_001`. The only available sidecar is the earlier 300-question authority sidecar, which covers `30` of these `85` rows.

## Current Release Preflight

The current-state release preflight was run only to record the blocker surface:

```bash
node scripts/learning/run_9709_release_preflight.js \
  --manifest data/manifests/9709_p1_m_standard_001_page_chain_surface_v1.json \
  --evidence-bundles docs/reports/2026-05-04-9709-p1-m-standard-001-evidence-bundles.json \
  --expected-count 85 \
  --json-out docs/reports/2026-05-04-9709-p1-m-standard-001-release-preflight-current.json \
  --markdown-out docs/reports/2026-05-04-9709-p1-m-standard-001-release-preflight-current.md
```

Result:

- status: `fail`
- blockers: `55`
- warnings: `30`
- blocker reason: `missing_authority_sidecar_entry`
- warning reason: `manifest_primary_topic_missing_sidecar_canonical_present`
- diagram consistency blockers: `0`
- OCR empty blockers: `0`

This confirms the visual/evidence side is clean enough for the preflight checks it can exercise, but the authority side is incomplete for the shard.

## Gates Not Run

The following stages were not run as pass/fail release evidence:

- question analysis backfill
- question search gate
- classifier/OCR release gate
- production-ready release gate

Reason: running those now would be partial or stale. `55/85` rows are missing from local `question_bank`, and the supported registry backfill cannot create them without authoritative `primary_topic_path` values. Filling topic paths by guesswork would violate the authority-line boundary.

## Next Valid Step

The next valid unit is a shard-scoped authority alignment/backfill step for `p1_m_standard_001`:

1. Produce a `p1_m_standard_001` authority sidecar or aligned manifest from approved syllabus/topic authority.
2. Populate `primary_topic_path` or an equivalent canonical authority pack for all `85` rows.
3. Re-run registry backfill and confirm `85/85` local `paper_question` rows.
4. Then run analysis backfill, question search gate, classifier/OCR gate, and release preflight again.

Until then, `p1_m_standard_001` is post-extraction-ready but not production-ready.
