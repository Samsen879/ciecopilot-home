# 9709 Question Bank Data Recovery Report

Date: 2026-04-16
Issue: `#202`
Status: paper-backed registry recovery applied; descriptor posture still red

## Scope

This report records the `#202` recovery slice only:

- ensure the frozen pilot curriculum nodes exist in the target environment
- recover manifest-backed `paper_question` rows into `public.question_bank`
- bind deterministic `primary_topic_id` values from manifest `primary_topic_path`
- preserve existing `imported_question` history rather than rewriting it
- record before/after counts for `imported_question` vs `paper_question`

It does not claim descriptor readiness, gate-green posture, or broader classification enrichment.

## Environment Posture

Two environment issues mattered during execution:

- `npm run workflow:baseline:sync` is currently unreliable in this AO session because the preserved root workspace lacks the upstream-tracking posture that script expects.
- the originally created `task/202-paper-question-registry-backfill` worktree came from stale `baseline/origin-main` at `cfb9d2b`, while live `origin/main` was already at `41e7511` and contained merged `#198/#199/#200/#201`.

To avoid stalling, this slice was moved into a fresh governed task worktree created directly from `origin/main`:

- branch: `task/202-paper-question-registry-backfill-mainline`
- worktree: `/home/samsen/code/ciecopilot-home/.worktrees/task-202--paper-question-registry-backfill-mainline`

The direct Supabase service-client path also failed in this shell with `TypeError: fetch failed`, so the live DB execution and verification for this issue were run through `SUPABASE_PG_COMPAT=true`, which uses the same `DATABASE_URL` but bypasses the failing HTTP transport in this environment.

## Focused Verification

Targeted Jest coverage:

```bash
node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js \
  --runInBand \
  --runTestsByPath \
  --config '{"testEnvironment":"node","testMatch":["**/__tests__/**/*.js","**/?(*.)+(spec|test).js"],"testPathIgnorePatterns":["/node_modules/"],"transform":{}}' \
  scripts/learning/__tests__/paper-question-registry-backfill.test.js \
  scripts/learning/__tests__/run-paper-question-registry-backfill.test.js
```

Observed result:

- `2` suites passed
- `8` tests passed

CLI dry-run:

```bash
SUPABASE_PG_COMPAT=true node scripts/learning/run_paper_question_registry_backfill.js \
  --manifest data/manifests/9709_question_search_recovery_v1.json \
  --dry-run
```

Observed result:

- `processed=17`
- `inserted=17`
- `updated=0`
- `conflicts=0`
- `curriculumNodes.inserted=6`

Live apply:

```bash
SUPABASE_PG_COMPAT=true node scripts/learning/run_paper_question_registry_backfill.js \
  --manifest data/manifests/9709_question_search_recovery_v1.json
```

Observed result:

- `processed=17`
- `inserted=17`
- `updated=0`
- `conflicts=0`
- `curriculumNodes.inserted=6`

Idempotency rerun:

```bash
SUPABASE_PG_COMPAT=true node scripts/learning/run_paper_question_registry_backfill.js \
  --manifest data/manifests/9709_question_search_recovery_v1.json \
  --dry-run

SUPABASE_PG_COMPAT=true node scripts/learning/run_paper_question_registry_backfill.js \
  --manifest data/manifests/9709_question_search_recovery_v1.json
```

Observed result:

- rerun dry-run: `inserted=0`, `updated=17`, `curriculumNodes.existing=6`
- rerun apply: `inserted=0`, `updated=17`, `curriculumNodes.existing=6`

Database checks:

```bash
psql "$DATABASE_URL" -c "select source_kind, count(*) from public.question_bank where subject_code = '9709' group by 1 order by 1;"
psql "$DATABASE_URL" -c "select source_kind, count(*) from public.learning_question_search_projection where subject_code = '9709' group by 1 order by 1;"
psql "$DATABASE_URL" -c "select count(*) as qd_9709_ok from public.question_descriptions_v0 where syllabus_code = '9709' and status = 'ok';"
psql "$DATABASE_URL" -c "select topic_path::text from public.curriculum_nodes where syllabus_code = '9709' and version_tag = '2025-2027_v1' order by 1;"
```

## Before / After

| Surface | Before | After |
| --- | --- | --- |
| `question_bank imported_question` (`9709`) | `11` | `11` |
| `question_bank paper_question` (`9709`) | `0` | `17` |
| `learning_question_search_projection imported_question` (`9709`) | `11` | `11` |
| `learning_question_search_projection paper_question` (`9709`) | `0` | `17` |
| `question_descriptions_v0 status='ok'` (`9709`) | `0` | `0` |
| `curriculum_nodes` rows for `9709` + `2025-2027_v1` | `3` browser-fixture rows only | `9` total rows, including `9709`, `9709.p1`, `9709.p1.trigonometry`, `9709.p3`, `9709.p3.integration`, `9709.p3.trigonometry` |

## Gate-Critical Rows

Focused verification for the two pinned paper-backed cases:

```sql
select
  qb.storage_key,
  qb.q_number,
  qb.source_kind,
  cn.topic_path::text as topic_path,
  qb.prompt_representation,
  qb.provenance_summary
from public.question_bank qb
left join public.curriculum_nodes cn on cn.node_id = qb.primary_topic_id
where qb.storage_key in (
  '9709/s19_qp_11/questions/q06.png',
  '9709/s16_qp_33/questions/q07.png'
)
order by qb.storage_key;
```

Observed result:

- both rows now exist as `paper_question`
- both rows resolve to deterministic pilot topics:
  - `9709/s19_qp_11/questions/q06.png` -> `9709.p1.trigonometry`
  - `9709/s16_qp_33/questions/q07.png` -> `9709.p3.integration`
- both rows carry manifest-backed provenance showing `source_reason=gate_pin`, `gate_critical=true`, and the frozen `primary_topic_path`
- both rows still have `prompt_representation = null` because `question_descriptions_v0` remains empty for `9709` in the checked environment

## Honest Conclusion

This issue’s recovery goal is met for the checked environment:

- manifest-backed pilot rows now exist in `public.question_bank` as `paper_question`
- the search projection exposes those same `paper_question` rows
- the frozen pilot curriculum nodes exist and resolve cleanly
- deterministic topic ownership now exists for the gate-critical pilot rows
- existing `imported_question` rows were preserved instead of being rewritten

## Residual Risks

- descriptor posture is still red: `question_descriptions_v0` remains at `0` usable `9709` rows, so the new paper-backed rows still do not carry hydrated prompt text in this environment
- the direct service-role HTTP client failed with `TypeError: fetch failed` in this shell, so live execution currently depends on the `SUPABASE_PG_COMPAT` path for DB-backed scripts
- this slice intentionally did not add broad topic-graph generation or family/question-type enrichment; those remain follow-up work outside `#202`
