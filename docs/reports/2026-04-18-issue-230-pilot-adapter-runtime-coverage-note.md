# Issue 230 Pilot Adapter Runtime Coverage Note

## Scope

This slice wires the approved `9709` pilot rubric templates into the real `evaluate-v1` marking path behind the existing runtime flag surface.

## Approved Runtime Coverage

| Question type | Template path | Adapter methods |
| --- | --- | --- |
| `9709.trigonometry.identities` | `data/learning_runtime/pilot_rubrics/9709.trigonometry.identities.json` | `proof_structure_check`, `symbolic_check` |
| `9709.trigonometry.equations` | `data/learning_runtime/pilot_rubrics/9709.trigonometry.equations.json` | `symbolic_check`, `numeric_check` |
| `9709.integration.application` | `data/learning_runtime/pilot_rubrics/9709.integration.application.json` | `transform_bundle_check`, `symbolic_check` |
| `9709.differential_equations.separable` | `data/learning_runtime/pilot_rubrics/9709.differential_equations.separable.json` | `transform_bundle_check`, `numeric_check` |

## Guardrails

- Runtime dispatch stays limited to the four adapter methods above.
- Pilot template binding only activates when `MARKING_V1_RUNTIME_BRIDGE_ENABLED=true`.
- Released-rubric metadata is still required before a pilot template is bound.
- Authoritative vs conservative posture still comes from the existing released-scope and runtime-authority rules; pilot dispatch does not widen that gate.

## Focused Proof

- `api/learning/__tests__/adapter-method-dispatcher.test.js`
- `api/learning/__tests__/subject-adapter-registry.test.js`
- `api/marking/__tests__/rubric-resolver-v1.test.js`
- `api/marking/__tests__/evaluate-v1.test.js`
