# Wave A Shard Verdict

- status: `fail`
- shard_id: `shard_1`
- target_row_count: `10`
- provider_failures: `10`
- gate_pass: `True`
- projection_pass: `False`
- full_review_acceptance: `0.0`

## Failures
- `provider_failures_exceeded`: `{"actual": 10, "code": "provider_failures_exceeded", "expected_max": 0}`
- `current_shard_projection_incomplete`: `{"actual": 0.0, "code": "current_shard_projection_incomplete", "expected_min": 1.0}`
- `projection_audit_failed`: `{"code": "projection_audit_failed"}`
- `full_review_acceptance_below_threshold`: `{"actual": 0.0, "code": "full_review_acceptance_below_threshold", "expected_min": 0.9}`

## Execution Fingerprint

- `repo_sha`: `"15dd7ea012ba0465149d12a8b3398d58b138313c"`
- `branch`: `"feat/242"`
- `manifest`: `{"digest": "3332454c981179e317988b45f847b47afb5c658226167344b782504909d8061b", "manifest_id": "9709_question_search_expansion_wave_a_v1", "path": "data/manifests/9709_question_search_expansion_wave_a_v1.json"}`
- `lane_results`: `{"digest": "d8b6b56c014b4b3557d7a9215d4c6628fac82ec59b6d79ee07d5b073b0e4235a", "path": "docs/reports/2026-04-19-9709-wave-a-shard1-results.json"}`
- `gate`: `{"digest": "0512e871e0d0156347e9c140fa80fd7ae4e833f001b08dce44b3e4bacd778610", "path": "docs/reports/2026-04-19-9709-wave-a-shard1-gate.json"}`
- `projection_audit`: `{"digest": "9be7fcbd83512d32e8c53b545c008d99f2bf9b09068306bc0a69063b01e4a6c2", "path": "docs/reports/2026-04-19-9709-wave-a-shard1-projection-audit.json"}`
- `full_review`: `{"digest": "d0c2021c71b0fa837a9301208b98ef2fe63cd0e0f89e3958101d99607076f7d3", "path": "docs/reports/2026-04-19-9709-wave-a-shard1-full-review.json"}`
- `thresholds`: `{"contract_id": "9709_wave_a_thresholds_v1", "digest": "19f8a6f9b29b16ce2a358faea1da710edce16d41e720f6f7994f68d14f2cec06", "path": "data/contracts/9709_wave_a_thresholds_v1.json"}`
- `evidence_bundles`: `{"digest": "708444f745005db864b9bdc2e8fab389c7beedee29bbf5e3580d46929344d493", "path": "docs/reports/2026-04-19-9709-wave-a-shard1-bundles.json"}`
