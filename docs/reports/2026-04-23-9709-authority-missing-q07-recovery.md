# 2026-04-23 9709 Authority-Missing q07 Recovery

## Scope

- issue slug: `9709-authority-missing-q07`
- target row: `9709/s17_qp_63/questions/q07.png`
- goal: resolve the last `blocked_authority_missing` row from the ready-only / prompt-backfill chain without inventing taxonomy truth

## Authority Decision

The row can now be advanced truthfully as `9709.p5.representation_of_data`.

Why this crosswalk is defensible:

- checked-in live probe evidence already shows this row is a histogram with `Length (cm)` on the x-axis and `Frequency density` on the y-axis:
  - `data/manifests/9709_diagram_lane_live_probe_v1.json`
  - `docs/reports/2026-04-16-9709-diagram-lane-live-probe-results.json`
- the checked-in current syllabus taxonomy places histograms and frequency-density interpretation under Paper 5 Representation of Data:
  - `data/syllabus/9709syllabus.txt`
- historical component review confirmed that `9709/63` in June 2017 was `Paper 6: Probability & Statistics 1`, and the mark scheme’s Q7 is the histogram / frequency-density / grouped-data question:
  - `https://bestexamhelp.com/exam/cambridge-international-a-level/mathematics-9709/2017/9709_s17_qp_63.pdf`
  - `https://www.teachifyme.com/wp-content/uploads/2016/05/9709_s17_ms_63.pdf`

The repo’s current canonical Statistics 1 taxonomy lives under `p5`, not `p6`, so the truthful freeze is a historical `paper 63 -> current p5 S1` crosswalk, not a synthetic `p6.statistics.*` branch.

## Checked-In Changes

- corrected the q07 live-probe topic label to `9709.p5.representation_of_data`
  - `data/manifests/9709_diagram_lane_live_probe_v1.json`
- froze the q07 authority sidecar entry onto `9709.p5.representation_of_data`
  - `data/manifests/9709_authority_ready_batch_300_authority_sidecar_v2.json`
- added the minimal seed nodes required to resolve that path in the 300-row batch seed
  - `data/curriculum/9709_authority_ready_batch_300_nodes_v2.json`
- added a regression that proves q07 now becomes `ready`
  - `scripts/learning/__tests__/run-9709-authority-ready-batch.test.js`

## Targeted Artifacts

One-row rerun inputs and outputs were materialized under:

- `docs/reports/2026-04-23-9709-authority-missing-q07-manifest.json`
- `docs/reports/2026-04-23-9709-authority-missing-q07-authority-sidecar.json`
- `docs/reports/2026-04-23-9709-authority-missing-q07-curriculum-seed.json`
- `docs/reports/2026-04-23-9709-authority-missing-q07-lane-results.json`
- `docs/reports/2026-04-23-9709-authority-missing-q07-authority-manifest.json`
- `docs/reports/2026-04-23-9709-authority-missing-q07-aligned-manifest.json`
- `docs/reports/2026-04-23-9709-authority-missing-q07-ready-manifest.json`
- `docs/reports/2026-04-23-9709-authority-missing-q07-evidence-bundles.json`

Key artifact result:

- authority freeze verdict: `ready`
- canonical topic path: `9709.p5.representation_of_data`
- ready items in the one-row rerun: `1`

## Commands Run

Regression:

```bash
npm test -- --runInBand scripts/learning/__tests__/run-9709-authority-ready-batch.test.js
```

One-row artifact generation:

```bash
node --input-type=module - <<'NODE'
// filtered q07 inputs from the checked-in 300-row batch sources
// wrote the one-row manifest / sidecar / seed / lane-results and ready-batch artifacts
NODE
```

Registry backfill:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/learning/run_paper_question_registry_backfill_host.ps1 \
  -Manifest docs/reports/2026-04-23-9709-authority-missing-q07-ready-manifest.json \
  -CurriculumSeed docs/reports/2026-04-23-9709-authority-missing-q07-curriculum-seed.json
```

Question-analysis backfill:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/learning/run_question_analysis_backfill_host.ps1 \
  -Manifest docs/reports/2026-04-23-9709-authority-missing-q07-ready-manifest.json \
  -EvidenceBundles docs/reports/2026-04-23-9709-authority-missing-q07-evidence-bundles.json
```

## Downstream Results

Registry backfill output:

```json
{
  "processed": 1,
  "inserted": 0,
  "updated": 1,
  "conflicts": 0,
  "dryRun": false,
  "curriculumNodes": {
    "inserted": 0,
    "existing": 3
  },
  "preview": [
    {
      "storage_key": "9709/s17_qp_63/questions/q07.png",
      "q_number": 7,
      "action": "update",
      "primary_topic_id": "9328999a-b132-4feb-95db-f0b6c4331b2c",
      "prompt_representation_source": "missing",
      "source_kind": "paper_question"
    }
  ]
}
```

Question-analysis backfill output:

```json
{
  "processed": 1,
  "backfilled": 1,
  "skipped": 0,
  "items": [
    {
      "question_id": "598db135-46ec-4f79-b148-e73cc98fdfc3",
      "status": "backfilled",
      "classification_snapshot_id": "b1e8dba8-bb95-4c3f-b93a-67e341c3990f",
      "question_event_id": "9c187aee-532b-4960-87dc-6ce41f6ec66d"
    }
  ]
}
```

## DB State

Before rerun:

- `question_bank` row already existed for q07
- `primary_topic_path = 9709.p5.representation_of_data`
- `release_scope_status = non_released_fallback`
- `prompt_representation = null`
- active snapshot id: `3e72a03b-979e-48a0-b3da-b6eb74cc9e04`

After rerun:

- `question_bank.primary_topic_path` stayed `9709.p5.representation_of_data`
- `question_bank.release_scope_status` stayed `non_released_fallback`
- active snapshot id is now `b1e8dba8-bb95-4c3f-b93a-67e341c3990f`
- prior snapshot `3e72a03b-979e-48a0-b3da-b6eb74cc9e04` is superseded by the new snapshot
- new `QuestionClassified` event id: `9c187aee-532b-4960-87dc-6ce41f6ec66d`

Residual DB posture after the rerun:

- `prompt_representation` is still `null`
- `provenance_summary.summary` is still `null`
- `provenance_summary.search_text` is still `null`
- `descriptor_summary_status = descriptor_missing_or_empty`
- `descriptor_search_text_status = missing`

## Conclusion

This slice resolves the authority blocker and produces a clean `ready` authority/alignment posture for q07, backed by checked-in evidence plus an auditable historical crosswalk.

It does not fully restore prompt material on the `question_bank` row. The rerun proves the remaining gap is downstream prompt persistence for diagram-only evidence bundles, not authority truth. That residual gap should be tracked separately from this authority-fix slice.
