# 2026-04-15 Question Search Slice V1 Report

## Scope

This report closes issue `#188` for the question-search foundation slice.

The scope is intentionally narrow:

- verify descriptor-source reality in the target environment
- freeze the retrieval fallback contract for descriptor reads
- record the imported-question caveat before projection work starts

No schema migration, API route, or search endpoint is added in this issue.

## Repo Evidence For Descriptor Source Posture

The current repository does not treat `question_descriptions_v1` or
`question_descriptions_prod_v1` as migration-owned runtime surfaces.

- `scripts/vlm/build_production_table_v1.py` builds `question_descriptions_v1`
  from `question_descriptions_v0`
- `scripts/vlm/publish_production_view_v1.py` publishes
  `question_descriptions_prod_v1` as a filtered view over
  `question_descriptions_v1`

That means later retrieval SQL cannot safely assume either relation exists in
every environment just because the repo contains the Python publishing flow.

## Repo Evidence For Imported-Question Join Risk

Imported questions are allowed to exist without paper-backed descriptor keys.

- `supabase/migrations/20260320110000_expand_question_bank_for_learning_runtime.sql`
  drops `NOT NULL` from `question_bank.storage_key` and
  `question_bank.q_number`
- `api/learning/__tests__/question-registry-repository.test.js` asserts that
  imported-question inserts do not persist `storage_key` or `q_number`

This matters because any descriptor join keyed on `(storage_key, q_number)` can
legitimately miss for imported questions.

## Target Environment Preflight

Commands run from this worker worktree against `"$DATABASE_URL"`:

```bash
psql "$DATABASE_URL" \
  -c "\dt+ public.question_descriptions_v0" \
  -c "\dt+ public.question_descriptions_v1" \
  -c "\dv+ public.question_descriptions_prod_v1" \
  -c "select count(*) as question_descriptions_v0_count from public.question_descriptions_v0;" \
  -c "select count(*) as question_descriptions_v1_count from public.question_descriptions_v1;" \
  -c "select count(*) as question_descriptions_prod_v1_count from public.question_descriptions_prod_v1;"
```

Observed result:

| Relation | Expected kind | Exists in target env | Row count |
| --- | --- | --- | --- |
| `public.question_descriptions_v0` | table | yes | `0` |
| `public.question_descriptions_v1` | table | no | not present |
| `public.question_descriptions_prod_v1` | view | no | not present |

The count queries for `question_descriptions_v1` and
`question_descriptions_prod_v1` failed with relation-not-found errors, which is
consistent with the existence check above.

## Frozen Fallback Contract

The retrieval slice must treat descriptor source selection as an explicit
runtime branch:

1. Prefer `public.question_descriptions_prod_v1` when that relation exists.
2. Otherwise fall back to `public.question_descriptions_v0` with
   `status = 'ok'`.
3. Do not create or publish `question_descriptions_v1` /
   `question_descriptions_prod_v1` as part of this issue.

This contract is now frozen for the next projection issue. Later SQL must own
the branch explicitly instead of assuming `question_descriptions_prod_v1`
exists.

## Imported-Question Caveat For Retrieval

Because `question_bank` supports imported questions that may not have
`storage_key` or `q_number`, paper-backed descriptor joins are partial by
design.

The next retrieval projection must therefore:

- use `LEFT JOIN` semantics for descriptor lookups keyed on
  `(storage_key, q_number)`
- preserve imported-question rows when no paper-backed descriptor matches
- fall back to runtime-owned text such as `prompt_representation` when a
  descriptor-backed summary is unavailable

This issue records that constraint only. It does not implement the projection.

## Preflight Notes

`npm run workflow:baseline:sync` was run before implementation because the
current repo workflow requires it. In this environment the script failed during
its root-worktree `git pull --ff-only` step because the preserved branch
`task/post-cleanup-baseline` has no upstream tracking branch. This was treated
as an environment preflight note only and did not change the descriptor-source
evidence above.

## Readiness For Issue #189

Issue `#188` does not expose a hard blocker for issue `#189`.

The required assumption for `#189` is now explicit:

- the projection must not assume `question_descriptions_prod_v1` exists
- the projection must implement the fallback branch defined in this report

The target local environment currently has `0` rows in
`question_descriptions_v0`, so later end-to-end retrieval verification will
need seeded or populated descriptor data. That is a data-posture note, not a
contract blocker.
