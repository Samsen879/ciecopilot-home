# 9702 Physics authority contract and component authority seed

- generated_on: `2026-06-09`
- status: `pass`
- issue: `#404`
- goal: `9702 Phase 2 component-level authority seed + contract without detailed syllabus-topic canonicalization`
- subject: `Physics (9702)`
- source_truth_inventory: `docs/reports/2026-06-09-9702-source-truth-inventory.json`
- authority contract: `data/contracts/9702_physics_authority_contract_v1.json`
- authority seed: `data/manifests/9702_physics_component_authority_seed_v1.json`
- production_ready_claimed: `false`
- canonical_syllabus_detailed_topic_claimed: `false`

## Scope

- Builds the minimum 9702 authority posture required for row alignment, centered on component nodes only.
- Supports five papers (`9702.p1` through `9702.p5`) and all discovered component IDs from tracked source.
- Keeps deterministic topic hints paper-scoped, explicitly as non-binding hints rather than canonical detailed topic assertions.
- Leaves canonical detailed syllabus-topic mapping unclaimed until an explicit 9702-wide syllabus alignment gate for detailed topics is completed.

## Source coverage inputs

- `data/past-papers/9702Physics` is the source root for 362 tracked source PDFs.
- `by_component` entries detected in source truth inventory: `11,12,13,14,21,22,23,24,31,32,33,34,35,36,37,38,41,42,43,44,51,52,53,54` (`24` components).
- `source_posture` from the inventory remains `historical_repo_source: 316`, `public_mirror_candidate_promoted_2026_06_02: 46`, no ambiguous blocked source.

## Contract / seed posture

- `9702_physics_authority_contract_v1.json` defines `9702` component-scoped authority as the accepted layer for row alignment only.
- `9702_physics_component_authority_seed_v1.json` provides one component authority item per tracked component ID.
- Component scope fields constrain authority to `component_scoped` rows for matching source component IDs and include `fallback_authority_topic_path` at paper root.
- Deterministic topic hints are optional and currently paper-scope (`9702.p{1..5}` fallback) until a dedicated syllabus-topic gate is introduced.

## Official syllabus source status

- No in-repo official 9702 syllabus source lock was found at implementation time.
- `canonical_syllabus_detailed_topic_claimed` is therefore `false` in both contract and seed.
- `official_syllabus_source.available: false` and a follow-up source-blocker note is recorded in the contract for future gate work.
- This phase can remain in `pass` state with conservative scope because it does not import or claim question rows for DB/search/RAG.

## Separation of authority layers

- Component authority: accepted and explicit (`9702.pN.cXY` / `9702.pN`) for all 24 discovered components.
- Detailed topic authority: not claimed; no canonical detailed topic path claim is made, only optional hinting.
- No 9709/9231 math taxonomy is used as authority truth in this contract/seed.
