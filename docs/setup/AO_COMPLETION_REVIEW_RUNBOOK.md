# AO Completion Review Runbook

## Purpose

AO now treats completion review as a durable control-plane gate.

- Implementation complete is not enough.
- `notify_human_ready` must not be treated as valid unless the current PR head also has an active completion-review posture of `accepted` or `waived`.
- The reviewer must be distinct from the current implementation owner.
- When the PR head SHA changes, stale completion-review records for the prior head are invalidated automatically.

## Record Model

Completion-review records are stored in repo-local AO state as typed objects with:

- `review_id`
- `task_id` and/or `pr_number`
- `head_sha`
- `status`
  - `requested`
  - `in_review`
  - `rejected`
  - `accepted`
  - `expired`
  - `waived`
- `validity_status`
  - `active`
  - `invalidated`
- reviewer identity
- implementation owner identity
- `verdict`
- `reason_codes`
- `findings`
- `evidence_refs`

Current operator posture is derived from those records and can resolve as:

- `missing_review`
- `requested`
- `in_review`
- `rejected`
- `accepted`
- `expired`
- `waived`
- `self_review`

## Inspection

Inspect all current completion-review postures:

```bash
node scripts/ao-completion-review.js
```

Inspect one PR:

```bash
node scripts/ao-completion-review.js --pr 141
```

Inspect one task with JSON output:

```bash
node scripts/ao-completion-review.js --task issue-131 --json
```

The CLI report includes:

- current posture
- whether the gate is satisfied
- reviewer identity
- evidence references
- recent history

You can also inspect the same data through `node scripts/ao-state.js --json` under `completion_reviews`.

## Writing Records

`ao-completion-review.js` accepts a typed JSON payload and upserts it directly into AO state.

Example accepted review payload:

```json
{
  "review_id": "completion-review-pr-141-accepted",
  "task_id": "issue-131",
  "pr_number": 141,
  "branch_name": "feat/131",
  "head_sha": "abc131",
  "status": "accepted",
  "validity_status": "active",
  "requested_at": "2026-04-01T09:00:00.000Z",
  "updated_at": "2026-04-01T09:05:00.000Z",
  "reviewed_at": "2026-04-01T09:05:00.000Z",
  "reviewer_session_name": "cie-reviewer-1",
  "reviewer_session_id": "cie-reviewer-1",
  "implementation_owner_session_name": "cie-70",
  "implementation_owner_session_id": "cie-70",
  "verdict": "accepted",
  "reason_codes": ["completion_review_accepted"],
  "findings": [],
  "evidence_refs": [
    {
      "source": "github",
      "kind": "review",
      "id": "rvw-141",
      "summary": "Independent reviewer accepted the completion review."
    }
  ]
}
```

Upsert it:

```bash
node scripts/ao-completion-review.js --upsert /tmp/completion-review.json --pr 141 --json
```

Example waiver payload:

```json
{
  "review_id": "completion-review-pr-141-waived",
  "task_id": "issue-131",
  "pr_number": 141,
  "branch_name": "feat/131",
  "head_sha": "abc131",
  "status": "waived",
  "validity_status": "active",
  "requested_at": "2026-04-01T09:00:00.000Z",
  "updated_at": "2026-04-01T09:06:00.000Z",
  "reviewed_at": "2026-04-01T09:06:00.000Z",
  "reviewer_session_name": "operator",
  "reviewer_session_id": "operator",
  "implementation_owner_session_name": "cie-70",
  "implementation_owner_session_id": "cie-70",
  "verdict": "waived",
  "reason_codes": ["completion_review_waived"],
  "findings": [],
  "evidence_refs": [
    {
      "source": "ao",
      "kind": "waiver",
      "id": "waiver-141",
      "summary": "Operator waived the completion-review gate for the current head."
    }
  ]
}
```

## Enforcement Notes

- A record with `status: accepted` does not satisfy the gate if the reviewer matches the current implementation owner. AO exposes that as `self_review`.
- `accepted` and `waived` satisfy the gate only while they remain active for the exact current `head_sha`.
- New commits invalidate older active completion-review records automatically with `invalidation_reason_codes: ["head_sha_changed"]`.
- Eval harness and scorecard output now surface missing or failed completion review as explicit governance findings.
