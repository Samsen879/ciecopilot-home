# Wave A Shard Verdict

- status: `fail`
- shard_id: `shard_1`
- target_row_count: `10`
- provider_failures: `1`
- gate_pass: `False`
- projection_pass: `False`
- full_review_acceptance: `0.9`

## Failures
- `provider_failures_exceeded`: `{"actual": 1, "code": "provider_failures_exceeded", "expected_max": 0}`
- `baseline_gate_failed`: `{"code": "baseline_gate_failed"}`
- `current_shard_projection_incomplete`: `{"actual": 0.9, "code": "current_shard_projection_incomplete", "expected_min": 1.0}`
- `projection_audit_failed`: `{"code": "projection_audit_failed"}`

## Execution Fingerprint

- `repo_sha`: `"78c33356da92ee2e7a9b3682dd1cd22a0a9af73f"`
- `branch`: `"feat/242"`
- `manifest`: `{"digest": "3332454c981179e317988b45f847b47afb5c658226167344b782504909d8061b", "manifest_id": "9709_question_search_expansion_wave_a_v1", "path": "data/manifests/9709_question_search_expansion_wave_a_v1.json"}`
- `lane_results`: `{"digest": "9eb8c02aa3566c94991cab264ae86fc06effa34e208c574beb781cd91fe1cab4", "path": "docs/reports/2026-04-19-9709-wave-a-shard1-results.json"}`
- `gate`: `{"digest": "f20f9e06999d1532751412c21ebbe8e492e085ab8a0c1c16d598b3337db1a9ba", "path": "docs/reports/2026-04-19-9709-wave-a-shard1-gate.json"}`
- `projection_audit`: `{"digest": "dfa4d5e97a5fb1d67d8db6fe960f5b655fbfc7973c615e5aac440543d15349ad", "path": "docs/reports/2026-04-19-9709-wave-a-shard1-projection-audit.json"}`
- `full_review`: `{"digest": "60ccce82c61813ad42a93f972ec5713c48a923bd02076dba7f1e152061a5a8d0", "path": "docs/reports/2026-04-19-9709-wave-a-shard1-full-review.json"}`
- `thresholds`: `{"contract_id": "9709_wave_a_thresholds_v1", "digest": "19f8a6f9b29b16ce2a358faea1da710edce16d41e720f6f7994f68d14f2cec06", "path": "data/contracts/9709_wave_a_thresholds_v1.json"}`
- `evidence_bundles`: `{"digest": null, "path": null}`
