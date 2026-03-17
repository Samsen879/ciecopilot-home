# RAG Current State 2026-03-16

## 1. Current checkpoint

As of `2026-03-16`, the current RAG mainline is still present and usable.

The most relevant recent commit chain is:

- `7c5546f` `Add Phase B production evidence rollout observability and rollback status`
- `ca82640` `fix: default s1 metric gate provider config`
- `b646e9b` `fix: align boundary preflight with migration chain`
- `79b5b8d` `fix: restore multi-subject chat scope and boundary coverage`
- `40af3af` `feat: checkpoint latest rag s2 backend baseline`
- `f324a94` `feat(rag): add S1.2/S1.3 benchmark toolkit and stabilize retrieval audit contract`
- `6e2d3f5` `feat(rag): add unified ask pipeline and benchmarks`

Current active runtime and tooling surface:

- active backend runtime: `api/rag/**`
- active RAG tooling: `scripts/rag/**`
- active canonical data path: `public.chunks` plus `hybrid_search_v2`
- active migration chain: `supabase/migrations/**`

Legacy RAG runtime and old bridge tooling were intentionally removed from the main track and are only retained under `legacy/restored-history/**` for reference.

## 2. What was verified today

### 2.1 API/runtime tests

The following active runtime suites passed:

- `api/rag/__tests__/ask-service.test.js`
- `api/rag/__tests__/boundary.contract.test.js`
- `api/rag/__tests__/s2-multi-hop-retriever.test.js`

Result:

- `3` suites passed
- `48` tests passed

### 2.2 Current RAG tooling/tests

The following current-toolchain suites passed:

- `scripts/rag/__tests__/canonical-chunks.test.js`
- `scripts/rag/__tests__/corpus-schema-compat.test.js`
- `scripts/rag/__tests__/question-aware-chunker.test.js`
- `scripts/rag/__tests__/s2-augmentation-eval.test.js`
- `scripts/rag/__tests__/production-evidence-manifest.test.js`

The initially failing rollout-status suite was not failing because of broken code. It failed because the checked-in runtime artifacts under `runs/backend/` were missing. After regenerating those artifacts, the following rollout suites passed:

- `scripts/rag/__tests__/production-evidence-rollout-status.test.js`
- `scripts/rag/__tests__/run-production-evidence-rollout-status.test.js`
- `scripts/rag/__tests__/run-production-evidence-first-online-rollout-verification.test.js`
- `scripts/rag/__tests__/run-production-evidence-rollout-gate.test.js`

Result:

- rollout status logic is healthy
- missing state was recoverable from checked-in manifests and runners

### 2.3 Live corpus health

A fresh corpus coverage summary was generated to `recovery/organized/rag-status/`.

Key results:

- `chunks.total_rows = 1387`
- `subject_counts = {9709: 993, 9702: 257, 9231: 137}`
- `source_type_counts = {note_md: 37, past_paper_pdf: 838, mark_scheme_pdf: 506, evidence_authored: 4, evidence_transformed: 2}`
- `source_ref_resolvability_rate = 1.0`
- `topic_path_coverage_rate = 0.984859`
- overall corpus coverage status: `pass`

This confirms that the current usable RAG data lives in `public.chunks`, not in the old `rag_*` tables.

### 2.4 S2 evidence chain

The `runs/backend/` gap for `S2` was partially recoverable and is now much clearer.

### 2.5 Reviewed draft promotion candidate surface

A backend-only reviewed draft promotion candidate surface now exists for evidence-gap follow-up work.

The current scope is intentionally narrow:

- scaffold a machine-readable review decision file from a draft bundle
- compile approved items into a `production_evidence_bundle`
- keep the compiled candidate at `bundle_status = governance_seed_only`

This does not change ingest status, whitelist state, rollout gates, `S2 advisory_only`, or the default `S1` route.

Fresh standard-path artifacts regenerated in this pass:

- `runs/backend/rag_s2_readiness_profile.json`
- `runs/backend/rag_s2_preflight.json`
- `runs/backend/rag_s2_route_classifier_model.json`
- `runs/backend/rag_s2_route_classifier_eval.json`
- `runs/backend/rag_s2_c1_classifier_gate.json`
- `runs/backend/rag_s2_c2_execution_checkpoint.json`
- `runs/backend/rag_s2_workflow_invariant_check.json`
- `runs/backend/rag_s2_augmentation_eval_summary.json`
- `docs/reports/rag_s2_augmentation_eval_report.md`
- `runs/backend/rag_s2_release_eval_summary.json`
- `docs/reports/rag_s2_release_eval_report.md`
- `runs/backend/rag_s2_advisory_gate_summary.json`
- `runs/backend/rag_s2_release_decision.json`
- `runs/backend/rag_s2_c3_eval_checkpoint.json`
- `runs/backend/rag_s2_c4_release_checkpoint.json`

Fresh prerequisite artifacts also regenerated:

- `runs/backend/rag_s1_contract_gate_summary.json`
- `runs/backend/rag_live_benchmark_latest.json`
- `runs/backend/rag_live_benchmark_stability.json`
- `runs/backend/rag_s1_metric_gate_orchestration.json`
- `runs/backend/rag_s1_metric_gate_summary.json`

Fresh readiness profile output:

- recommended `max_topic_depth` by subject:
  - `9709 = 3`
  - `9702 = 3`
  - `9231 = 3`
  - `9700 = 1`

Current reconstructed `S2` checkpoint state:

- `rag_s2_preflight.json`
  - required gate baseline = present
  - `S1 contract gate = pass`
  - `S1 metric gate = pass`
  - `S1.3 -> S2 go/no-go baseline = missing`
- `rag_s2_c1_classifier_gate.json = pass`
- `rag_s2_c2_execution_checkpoint.json = pass`
- `rag_s2_workflow_invariant_check.json = pass`
- `rag_s2_augmentation_eval_summary.json`
  - historical diagnostic artifact
  - no longer the release-authority input for the advisory gate
- `rag_s2_release_eval_summary.json`
  - `status = pass`
  - `total_requests = 90`
  - `fallback_rate = 0`
  - `topic_leakage_rate = 0`
  - `evidence_traceability_rate = 1`
  - `target_slice_quality_vs_s1 = 0.016534`
  - `target_slice_case_pass_vs_s1 = 0.044444`
  - `route_counts = {s2_augmentation: 63, s1_default: 27}`
  - `readiness_guard_block_rate = 0.3`
- `rag_s2_advisory_gate_summary.json = pass`
- `rag_s2_release_decision.json`
  - `decision = go_s2_advisory_candidate`
  - `release_ready = true`
  - `release_mode = advisory_only`
  - `S1` default production route remains `b_simplified_retrieval_s1_v1`
- `rag_s2_c3_eval_checkpoint.json = pass`
- `rag_s2_c4_release_checkpoint.json = pass`

Important nuance:

- the historical augmentation-eval chain remains useful diagnostic evidence, but it is no longer the release-authority input
- the fresh release-authority chain was rerun under `RAG_CHAT_ENABLED = true` using the new release benchmark contract and then merged from three non-overlapping `30`-case chunks into the canonical `90`-case summary
- the resulting canonical release artifact is positive on all four advisory thresholds, so the earlier `hold` state is no longer the current authoritative conclusion

### 2.5 Phase B production evidence rollout

The original pilot manifest check for `data/evidence/production/pilot_ready_v1/manifest.json` passed, and the checked-in Phase B pilot surface now also includes a second single-subject ready bundle for `9231` at `data/evidence/production/pilot_ready_9231_v1/manifest.json`.

Verified `9702` pilot summary:

- `bundle_id = phase_b_pilot_ready_v1`
- `subject_codes = [9702]`
- `item_count = 5`
- `active_source_types = [evidence_authored, evidence_transformed]`
- `restricted_official_posture = internal_context_only`

Checked-in `9231` pilot summary:

- `bundle_id = phase_b_pilot_ready_9231_v1`
- `subject_codes = [9231]`
- `item_count = 5`
- `active_source_types = [evidence_authored, evidence_transformed]`
- `restricted_official_posture = internal_context_only`

The missing rollout baseline artifacts were regenerated into standard locations:

- `runs/backend/rag_phase_b_production_evidence_rollout_gate.json`
- `runs/backend/rag_phase_b_first_online_rollout_9702.json`
- `runs/backend/rag_phase_b_first_online_rollout_9231.json`
- `runs/backend/rag_phase_b_production_evidence_rollout_status.json`
- matching Markdown reports under `docs/reports/`

Current rollout status is:

- `online_bundle_ids = [phase_b_pilot_ready_v1, phase_b_pilot_ready_9231_v1]`
- `online_subject_codes = [9702, 9231]`
- `online_corpus_versions = [rag_production_evidence_pilot_20260313, rag_production_evidence_pilot_9231_20260317]`
- `rollout_healthy = true`
- `rollback_required = false`
- `recommended_action = keep_online`
- `s1_passed = true`
- `s2_passed = true`

Important nuance:

- the rollout contract is now dual-online but still explicit-entry and fail-closed
- `9702` and `9231` each receive only their own promoted production-evidence corpus
- `evidence_reserved` remains excluded for both subjects
- the merged rollout status is only healthy because both focused verification artifacts are present:
  - `runs/backend/rag_phase_b_first_online_rollout_9702.json`
  - `runs/backend/rag_phase_b_first_online_rollout_9231.json`

## 3. What this means for development

You can continue RAG development from the current mainline.

The project did **not** lose the main RAG backend track. The main damage area was gitignored local artifacts and generated runtime files. The actual active code path, active migrations, and the core remote corpus state are still present.

Important clarification:

- the missing `runs/backend/*.json` files do **not** mean `S2` was unfinished
- they mean some historical runtime proofs/checkpoints were local generated artifacts and were not committed
- `S2` implementation and closeout evidence still exists in committed source and planning records
- the clearest signals are:
  - commit `40af3af` = `feat: checkpoint latest rag s2 backend baseline`
  - `docs/superpowers/plans/2026-03-13-rag-route-a-cross-subject-replication.md` shows execution status as complete on `2026-03-13`
  - `scripts/rag/run_s2_advisory_gate.js`
  - `scripts/rag/run_s2_release_decision.js`
  - `scripts/rag/run_s2_c3_eval_checkpoint.js`
  - `scripts/rag/run_s2_c4_release_checkpoint.js`
  - the current `api/rag` tests and `scripts/rag` S2 tests are still green

The stronger conclusion after this reconstruction pass is:

- `S2` is clearly beyond implementation and already in closeout / release-check territory
- the rebuilt chain now proves `preflight -> C1 -> C2 -> full eval -> advisory gate -> release decision -> C3 -> C4` all exist as real executable checkpoints
- current authoritative release evidence now supports `S2` as an advisory-ready candidate
- current release posture is `go_s2_advisory_candidate`
- this does **not** replace `S1` as the default production route; the release remains `advisory_only`

## 3.1 Fresh root-cause follow-up

The latest evidence no longer supports the earlier "`0` because chat was disabled" explanation as the main blocker.

That explanation was real but incomplete:

- the original advisory workflow was misconfigured for release-style evaluation
- `.github/workflows/rag-s2-advisory-gate.yml` did not force `RAG_CHAT_ENABLED = true`
- the workflow also did not provide a chat-usable `DASHSCOPE_API_KEY` alias
- those wiring problems have now been fixed

What the corrected fresh evidence shows is stricter:

- `S2` remains boundary-clean
- `S2` remains non-leaking
- `S2` remains fully traceable
- but the current release-quality contract still scores `S2` at or below `S1`

The current scoring contract is still defined by the old benchmark machinery:

- `data/eval/rag_s2_augmentation_eval_v1.json` is still dominated by title/topic-path style references
- all rows still use a single `min_answer_score = 0.45`
- `scripts/rag/lib/s1_2_benchmark.js` still computes grounded-answer quality as:
  - `answer_quality_score = (reference.f1 + keyword.hit_rate) / 2`

That contract is strong at catching unsupported answers and missing keywords.
It is weak at rewarding the exact things `S2` is supposed to improve:

- cross-topic synthesis
- planning structure
- prerequisite ordering
- longer grounded explanations that remain evidence-bounded

Fresh follow-up after fixing the advisory workflow env contract:

- a fresh network-enabled `1`-case probe under the standard `20s` per-case timeout still did not complete the real execution path:
  - `runs/backend/rag_s2_augmentation_eval_chat_probe.json`
  - `docs/reports/rag_s2_augmentation_eval_chat_probe.md`
  - result: `fallback_reason_counts = { S2_TIMEOUT: 1 }`
- a fresh diagnostic `1`-case probe with a larger runtime budget did complete the real execution path:
  - `runs/backend/rag_s2_augmentation_eval_chat_probe_timeout60.json`
  - `docs/reports/rag_s2_augmentation_eval_chat_probe_timeout60.md`
  - result:
    - `chat_mode = upstream_ok` for both `S1` and `S2`
    - `fallback_rate = 0`
    - `topic_leakage_rate = 0`
    - `evidence_traceability_rate = 1`
    - `target_slice_quality_vs_s1 = -0.005344` on `s2-aug-001`

That already ruled out "chat was disabled" as the whole story.

Additional fixed-sample diagnostic evidence now exists:

- a checked-in `A`-profile diagnostic probe keeps the dominant subject skew from the canonical `90`-case set while forcing all three `target_slice` families to remain represented:
  - `data/eval/rag_s2_augmentation_eval_probe10_v1.json`
  - `data/eval/rag_s2_augmentation_eval_probe10_v1_manifest.json`
- the corresponding builder and regression test are now present:
  - `scripts/rag/build_s2_augmentation_eval_probe10_set.js`
  - `scripts/rag/__tests__/build-s2-augmentation-eval-probe10-set.test.js`
- the first live `probe10` rerun exposed timeout noise:
  - `runs/backend/rag_s2_augmentation_eval_probe10_summary.json`
  - `docs/reports/rag_s2_augmentation_eval_probe10_report.md`
  - result:
    - `status = warn`
    - `fallback_rate = 0.125`
    - `target_slice_quality_vs_s1 = -0.066615`
    - `fallback_reason_counts = { S2_TIMEOUT: 1 }`
- the clean no-fallback `probe10_timeout90` rerun is the more important signal:
  - `runs/backend/rag_s2_augmentation_eval_probe10_timeout90_summary.json`
  - `docs/reports/rag_s2_augmentation_eval_probe10_timeout90_report.md`
  - result:
    - `status = pass`
    - `fallback_rate = 0`
    - `topic_leakage_rate = 0`
    - `evidence_traceability_rate = 1`
    - `target_slice_quality_vs_s1 = -0.015841`
    - `target_slice_case_pass_vs_s1 = 0`
    - slice deltas:
      - `cross_topic = -0.013133`
      - `global_planning = -0.006705`
      - `prerequisite_chain = -0.028587`

This is the cleanest current diagnosis:

- the blocker is no longer plausibly "only the workflow env was wrong"
- the blocker is not just timeout noise either
- even after removing fallback from the sample, the current reference/F1-heavy contract still records `S2` as slightly worse than `S1`

The latest canonical full eval is even stricter, but also noisier:

- `runs/backend/rag_s2_augmentation_eval_summary.json`
- `docs/reports/rag_s2_augmentation_eval_report.md`
- result:
  - `status = warn`
  - `run_config.round_aborted = true`
  - `total_requests = 82`
  - `fallback_rate = 0.296875`
  - `target_slice_quality_vs_s1 = -0.101409`
  - `target_slice_case_pass_vs_s1 = -0.187263`
  - `fallback_reason_counts = { S2_TIMEOUT: 18, S2_INFRA_ERROR: 1 }`

Interpretation:

- the canonical run proves the current release path is not releasable as-is
- the clean `probe10_timeout90` run proves that the remaining blocker is not solely timeout noise
- together they point to a release-benchmark contract problem first, and only secondarily to runtime-budget pressure

The remaining hold should therefore be interpreted as:

- not a missing-artifact problem
- not proof that `S2` implementation is unfinished
- not yet clean proof of a product regression
- a benchmark/reference/scoring contract that is not reliable enough to authorize release

The other former blocker was not a product issue:

- `top_failing_cases_or_remediation_missing` was a `C3` checkpoint-script problem
- the fresh full eval had `top_failing_cases = []` because it had no case-level failures
- `C3` was incorrectly treating "no failing rows to locate" as a failure even when remediation suggestions already existed for the zero-delta hold
- after fixing that contract, `runs/backend/rag_s2_c3_eval_checkpoint.json` now passes

Governance closure also improved in this pass:

- `.github/workflows/rag-s2-advisory-gate.yml` now exists
- `docs/reports/rag_s2_advisory_workflow_and_kill_switch_runbook.md` now exists
- `docs/reports/INDEX.md` now exists
- `runs/backend/rag_s2_workflow_invariant_check.json` now passes
- `runs/backend/rag_s2_c4_release_checkpoint.json` now passes

The former release hold has now been cleared by the new release-authority chain:

- `runs/backend/rag_s2_release_eval_summary.json = pass`
- `runs/backend/rag_s2_advisory_gate_summary.json = pass`
- `runs/backend/rag_s2_release_decision.json = go_s2_advisory_candidate`

## 3.2 Release Benchmark Redesign Execution

The release-benchmark redesign is no longer only a spec/plan.
The first executable implementation slice now exists in source.

New code and checked-in release-contract assets added in this pass:

- `scripts/rag/lib/s2_release_eval_contract.js`
- `scripts/rag/lib/s2_release_eval.js`
- `scripts/rag/build_s2_release_eval_set.js`
- `scripts/rag/run_s2_release_eval.js`
- `data/eval/rag_s2_release_eval_v1.json`
- `data/eval/rag_s2_release_eval_v1_manifest.json`
- new focused tests for:
  - release benchmark artifact semantics
  - release case schema
  - release scoring
  - release dataset builder
  - release eval runner defaults
  - advisory gate default input migration

This implementation preserves the intended boundary:

- historical `rag_s2_augmentation_eval_v1` artifacts remain diagnostic
- future release authority is intended to come from `rag_s2_release_eval_v1`
- advisory gate thresholds are unchanged
- `advisory_only` and `S1` default-route policy are unchanged
- `run_s2_release_eval.js` now fails closed unless `RAG_CHAT_ENABLED = true`

Fresh runtime probes against the new release-eval path now exist:

- pre-guard local diagnostics:
  - `runs/backend/rag_s2_release_eval_smoke_summary.json`
  - `docs/reports/rag_s2_release_eval_smoke_report.md`
  - `runs/backend/rag_s2_release_eval_limit10_summary.json`
  - `docs/reports/rag_s2_release_eval_limit10_report.md`
- chat-enabled smoke:
  - `runs/backend/rag_s2_release_eval_smoke_chat_summary.json`
  - `docs/reports/rag_s2_release_eval_smoke_chat_report.md`
- chat-enabled slice3 diagnostic:
  - `runs/backend/rag_s2_release_eval_slice3_chat_summary.json`
  - `docs/reports/rag_s2_release_eval_slice3_chat_report.md`
  - v2 chat-enabled slice3 confirmation after the grouped-anchor / uncertainty-posture contract update:
    - `runs/backend/rag_s2_release_eval_slice3_chat_v2_summary.json`
    - `docs/reports/rag_s2_release_eval_slice3_chat_v2_report.md`
  - v2 chat-enabled `10`-case confirmation:
    - `runs/backend/rag_s2_release_eval_limit10_chat_v2_summary.json`
    - `docs/reports/rag_s2_release_eval_limit10_chat_v2_report.md`
  - canonical full release-authority rerun:
    - `runs/backend/rag_s2_release_eval_summary.json`
    - `docs/reports/rag_s2_release_eval_report.md`

Fresh release-eval v1 results so far:

- pre-guard local diagnostics:
  - were run before the new fail-closed `RAG_CHAT_ENABLED` guard existed
  - they should be treated as implementation diagnostics, not as release-authoritative evidence
- chat-enabled smoke (`1` case):
  - `fallback_rate = 0`
  - `topic_leakage_rate = 0`
  - `evidence_traceability_rate = 1`
  - `target_slice_quality_vs_s1 = 0`
  - `target_slice_case_pass_vs_s1 = 0`
  - both `S1` and `S2` remained `QUALITY_MISS`
  - both sides reached:
    - `required_anchor_hit_rate = 0.666667`
    - `slice_reasoning_hit_rate = 0.5`
  - both sides failed only on:
    - `answer_quality_below_threshold`
- chat-enabled slice3 diagnostic (`3` cases, one per `cross_topic / global_planning / prerequisite_chain`):
  - `fallback_rate = 0`
  - `topic_leakage_rate = 0`
  - `evidence_traceability_rate = 1`
  - `target_slice_quality_vs_s1 = 0.055555`
  - `target_slice_case_pass_vs_s1 = 0`
  - by slice:
    - `cross_topic = 0`
    - `global_planning = 0.166666`
    - `prerequisite_chain = 0`

The failure shape is also now clearer inside the new release-eval rows:

- `required_anchor_hit_rate` can now exceed the old title/path pattern
- `slice_reasoning_hit_rate` is no longer forced to `0` once chat-enabled execution is actually used
- `fallback_reason_counts = {}`

Interpretation:

- the new release-eval runner is technically working
- the runner is now protected against another accidental non-chat local rerun
- the first properly chat-enabled smoke no longer collapses to title-only answers
- the first chat-enabled multi-slice batch already shows that positive separation is possible under the new contract
- the grouped-anchor plus uncertainty-posture release contract is now validated on:
  - a `3`-case multi-slice batch
  - a `10`-case broader chat-enabled batch
  - the canonical `90`-case release-authority rerun
- the canonical release-authority result is:
  - `fallback_rate = 0`
  - `topic_leakage_rate = 0`
  - `evidence_traceability_rate = 1`
  - `target_slice_quality_vs_s1 = 0.016534`
  - `target_slice_case_pass_vs_s1 = 0.044444`
- advisory gate therefore now passes without weakening any thresholds

In practical terms, you can continue working on:

- `api/rag/lib/**`
- `api/rag/ask.js`
- `api/rag/search.js`
- `scripts/rag/**`
- `data/evidence/production/**`
- `supabase/migrations/**`

## 3.3 Phase C request telemetry surfaces

The backend now also has the first Phase C live-traffic telemetry loop in source.

New runtime capture surfaces:

- request-level telemetry is recorded for:
  - `/api/rag/ask`
  - `/api/rag/search`
- the canonical event schema is `rag_request_telemetry_v1`
- the local append-only sink writes raw events under:
  - `runs/backend/telemetry/`
  - file pattern: `rag_request_events_YYYY-MM-DD.jsonl`

The event surface is intentionally privacy-bounded:

- no raw query text
- no answer text
- no evidence snippets
- optional client linkage only through:
  - `x-client-session-id`
  - `x-trace-id`

The runtime metrics surface now includes stage timing and token-aware cost fields that the telemetry sink copies into the offline audit dataset:

- `metrics.latency_ms`
- `metrics.retrieval_latency_ms`
- `metrics.llm_latency_ms`
- `metrics.route_audit`
- `metrics.retrieval_audit`
- `metrics.cost_audit.usage.prompt_tokens`
- `metrics.cost_audit.usage.completion_tokens`
- `metrics.cost_audit.usage.embedding_tokens`

The new offline operator artifacts are:

- `runs/backend/rag_request_telemetry_audit_summary.json`
- `docs/reports/rag_request_telemetry_audit_report.md`
- optional action queue:
  - `runs/backend/rag_request_telemetry_action_queue.json`

The audit summary/report now answers the next-step operations question from request traffic evidence instead of one-off probes:

- route share
- fallback top reasons
- knowledge-hole clusters
- latency and cost hotspots
- production-evidence rollout exposure
- ranked `recommended_actions`

Important guardrail confirmation:

- `S2` remains `advisory_only`
- `S1` remains the default production route
- telemetry sink health is best-effort only and is not wired into advisory gating or release decisions

## 4. Remaining gaps

The current state is strong enough to continue development, but it is not a perfect reconstruction of every historical runtime artifact.

Known remaining gaps:

- `runs/backend/` is still gitignored by `.gitignore`, so any local-only runtime proof can still disappear from Git history
- `runs/backend/rag_s1_3_s2_go_no_go_decision.json` is still absent because its prerequisites are absent:
  - `runs/backend/rag_curriculum_nodes_quality_audit.json`
  - `runs/backend/rag_s1_3_forced_retrieval_summary.json`
- `docs/reports/rag_phase_b_production_evidence_runbook_20260313.md` is still absent

Important distinction:

- `runs/backend/rag_s2_augmentation_eval_summary.json`
- `docs/reports/rag_s2_augmentation_eval_report.md`
- `runs/backend/rag_s2_advisory_gate_summary.json`
- `runs/backend/rag_s2_release_decision.json`
- `runs/backend/rag_s2_c3_eval_checkpoint.json`
- `runs/backend/rag_s2_c4_release_checkpoint.json`

These six `S2` targets are no longer missing. They were rebuilt into their standard paths.

The remaining missing items are now mostly of two kinds:

- earlier-stage ignored baselines such as `rag_s1_3_s2_go_no_go_decision.json`
- historical tracked governance/docs files that had no recoverable Git history and therefore had to be freshly reconstructed rather than restored

Additional reconstruction note:

- `git log --all -- <path>` returned no history for:
  - `.github/workflows/rag-s2-advisory-gate.yml`
  - `docs/reports/rag_s2_advisory_workflow_and_kill_switch_runbook.md`
  - `docs/reports/INDEX.md`
  - the target `S2` proof artifacts under `runs/backend/`
- this means the current tracked governance/docs files are fresh reconstructions, not lossless Git restores
- and the missing `runs/backend` proofs were indeed local generated outputs rather than committed source files

These are important for audit completeness, but they are not blockers for continuing the main RAG development line.

They also should not be interpreted as evidence that `S2` itself was incomplete. They are reconstruction gaps in ignored local outputs, not proof that the underlying feature work failed to land.

## 5. Long-term planning files

Yes, the longer-horizon RAG planning files still exist.

Current mainline planning/spec files:

- `docs/superpowers/plans/2026-03-12-rag-single-track-cleanup.md`
- `docs/superpowers/plans/2026-03-13-rag-route-a-cross-subject-replication.md`
- `docs/superpowers/plans/2026-03-13-phase-b-production-evidence-first-online-rollout.md`
- `docs/superpowers/plans/2026-03-13-phase-b-production-evidence-gates.md`
- `docs/superpowers/plans/2026-03-13-phase-b-production-evidence-governance.md`
- `docs/superpowers/plans/2026-03-13-phase-b-production-evidence-ready-ingest-pilot.md`
- `docs/superpowers/plans/2026-03-13-phase-b-production-evidence-retrieval-rollout-gate.md`
- `docs/superpowers/plans/2026-03-13-phase-b-production-evidence-status-preflight.md`
- `docs/superpowers/plans/2026-03-14-phase-b-production-evidence-rollout-observability-rollback.md`

Matching design/spec files:

- `docs/superpowers/specs/2026-03-12-rag-single-track-cleanup-design.md`
- `docs/superpowers/specs/2026-03-13-phase-b-production-evidence-first-online-rollout-design.md`
- `docs/superpowers/specs/2026-03-13-phase-b-production-evidence-gates-design.md`
- `docs/superpowers/specs/2026-03-13-phase-b-production-evidence-ready-ingest-pilot-design.md`
- `docs/superpowers/specs/2026-03-14-phase-b-production-evidence-rollout-observability-rollback-design.md`

Recovered historical planning/reference files:

- `legacy/restored-history/DEVELOPMENT_ROADMAP.md`
- `legacy/restored-history/PROJECT_STATUS_COMPREHENSIVE_REPORT.md`

## 6. Recommended next steps

If the goal is to resume the interrupted RAG work with minimal context loss, the next highest-value steps are:

1. treat the canonical release-authority chain as the current source of truth:
   - `runs/backend/rag_s2_release_eval_summary.json`
   - `runs/backend/rag_s2_advisory_gate_summary.json`
   - `runs/backend/rag_s2_release_decision.json`
2. keep `S1` as the default production path and preserve `advisory_only` rollout semantics while using `S2` as an advisory candidate
3. use the canonical release report and top failing cases as the next improvement queue, rather than reopening the release-proof contract question
4. regenerate `rag_s1_3_s2_go_no_go_decision.json` after rebuilding:
   - `runs/backend/rag_curriculum_nodes_quality_audit.json`
   - `runs/backend/rag_s1_3_forced_retrieval_summary.json`
5. if you want audit completeness, keep the rebuilt `runs/backend/` outputs somewhere outside Git ignore or archive them under `recovery/`
6. do not overwrite the historical augmentation-eval artifacts; they remain useful diagnostic history, but release governance should continue to read the new release-eval artifact path
