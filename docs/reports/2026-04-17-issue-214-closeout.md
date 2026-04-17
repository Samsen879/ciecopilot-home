# Issue #214 Closeout

## Scope Shipped

- Feature flag: `LEARNING_ARTIFACT_LIFECYCLE_ENABLED`
- Canonical artifact lifecycle helpers for `unverified / verified / released / contested / superseded`
- Explicit lifecycle transitions in the artifact domain service
- Audit fields for verification, release, contest, and supersession
- Capability gating for shell visibility, body visibility, residency eligibility, and authoritative automation eligibility
- Conservative compatibility mapping from historical artifact fields into the frozen contract

## Historical Field Mapping

This implementation keeps the historical `trust_status` / `lifecycle_status` fields as compatibility fields, but the new canonical lifecycle state is `artifact_state`.

- Explicit contested markers or reason map to `contested`
- Explicit superseded markers, `superseded_by_artifact_id`, or `superseded_at` map to `superseded`
- Explicit release audit evidence (`released_by`, `released_at`, `release_evidence_ref`) maps to `released`
- Explicit operator/internal-review verification evidence (`verified_by`, `verified_at`, `verification_evidence_ref`) maps to `verified`
- Legacy `grounded`, `user_confirmed`, `revised`, and other ambiguous historical combinations without explicit operator evidence degrade to `unverified`
- `user_confirmed` never maps above `unverified`
- `grounded` never maps above `unverified` on its own

## Commands And Outcomes

1. `npm run workflow:baseline:sync`
   Outcome: `Already up to date.`

2. `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/artifact-service.test.js api/learning/__tests__/schema-contract.test.js`
   Outcome: `PASS api/learning/__tests__/schema-contract.test.js`, `PASS api/learning/__tests__/artifact-service.test.js`, `24 passed, 24 total`

3. `NODE_PATH=/home/samsen/code/ciecopilot-home/node_modules node --experimental-vm-modules /home/samsen/code/ciecopilot-home/node_modules/jest/bin/jest.js --runInBand api/learning/__tests__/artifact-api.test.js`
   Outcome: `PASS api/learning/__tests__/artifact-api.test.js`, `3 passed, 3 total`

## Residual Risks And Follow-Up Debt

- This issue intentionally stopped at the domain-layer lifecycle contract. Resident-pointer flips for unverified successors and placeholder behavior remain follow-up work for `#215`.
- The HTTP route still exposes only the legacy stage intents. The new `mark_verified` / `mark_released` transitions exist in the domain service behind the feature flag, but broader API/UI exposure is not part of `#214`.
- Other runtime readers still consume compatibility fields. They are kept aligned for now, but full surface adoption of `artifact_state` remains follow-up migration debt.
