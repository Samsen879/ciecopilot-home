# Reports Index

## Project Status

- `2026-03-30-mainline-closeout-report.md` - first-phase closeout report covering safe archival of the divergent local branch, creation of the new mainline recovery worktree, and current recommended next steps.
- `2026-03-30-local-branch-closeout-classification.md` - classification table for the local-only branch commits and archived WIP, showing what should be re-landed, archived only, or left retired.
- `2026-04-03-ao-phase6-debt-inventory.md` - first phase-6 repo-local debt inventory from `ao-state`, showing current cleanup candidates and explicit non-actions.
- `2026-04-03-ao-phase6-cleanup-execution.md` - execution record for moving the initial loose phase artifacts into `runs/phase6/` and verifying debt returned to zero.
- `2026-04-03-ao-phase6-soak-and-incident-report.md` - fresh phase-6 smoke and incident drill evidence for blocked-path, green-path, stale-leader, stale-worker, ambiguity, and dirty-worktree coverage.
- `2026-04-03-ao-reviewer-gate-rehearsal.md` - repo-local independent reviewer gate rehearsal showing request, claim, verdict, and durable freeze/release posture.
- `2026-04-12-phase-a-question-intelligence-slice-1-report.md` - takeover closeout report for the first Phase A question-intelligence slice, including scope, touched modules, focused verification, and residual risks.
- `2026-04-18-issue-232-scheduler-factor-coverage-report.md` - compact factor-coverage and verification report for the bounded `9709` scheduler-core upgrade on issue `#232`.
- `2026-04-19-9709-wave-a-shard1-execution-report.md` - shard-1 passing execution record for issue `#246`, including the rerun evidence, green gate posture, and bounded residual follow-up.
- `2026-04-19-9709-wave-a-shard2-execution-report.md` - shard-2 passing execution record for issue `#247`, including OCR-hard routing outcomes, green gate posture, and bounded residual follow-ups.
- `2026-04-19-9709-wave-a-shard3-execution-report.md` - shard-3 repaired passing execution record for issue `#248`, including the required reset, repaired host/local-db execution surfaces, and final green verdict.
- `2026-04-19-9709-wave-a-closeout-report.md` - Wave A aggregate closeout report for issue `#249`, combining the three shard verdicts, final baseline/probe gates, and the binary recommendation.
- `2026-04-20-issue-251-remediation-report.md` - bounded remediation report for the remaining Wave A `9709.p3.integration` aggregate-probe miss on `9709/s17_qp_33/questions/q04.png`.
- `2026-04-20-issue-252-remediation-report.md` - bounded remediation report for the remaining Wave A `9709.p3.trigonometry` aggregate-probe misses and their host-backfill verification posture.
- `2026-04-20-issue-253-wave-a-review-lane-remediation.md` - bounded fix report for the remaining Wave A shard-3 over-conservative review-lane case on `9709/s22_qp_13/questions/q02.png`.
- `2026-04-22-9709-syllabus-authority-vlm-dual-track-decision.md` - decision baseline for splitting `9709` topic alignment into an authoritative syllabus/paper line and a separate VLM visual-evidence line.
- `ao_codex_work_dossier_2026-03-26.md` - issue-by-issue reconstruction of prior AO and Codex work, with branch-vs-mainline divergence notes.
- `prd_progress_report_2026-03-16.md` - PRD-aligned project progress assessment after recovery, including current stage, recovery impact, and parallel workstreams.
- `learning_runtime_9709_integration_application_promotion_2026-03-24.md` - evidence-first justification for promoting `9709.integration.application` into released runtime scoring while keeping broader integration scope conservative.
- `learning_runtime_9709_differential_equations_separable_promotion_2026-03-25.md` - evidence-first justification for promoting `9709.differential_equations.separable` into released runtime scoring while keeping broader differential-equations scope conservative.
- `ao_operator_smoke_guide.md` - reproducible AO reconcile/doctor/lifecycle smoke flow and acceptance-fixture guide.

## RAG S2

- `rag_current_state_2026-03-16.md` - reconstructed `S2` state, artifact recovery status, and remaining blockers.
- `rag_request_telemetry_audit_report.md` - fixed-path Phase C request telemetry audit report covering route share, fallback clusters, knowledge-hole groups, latency/cost hotspots, rollout exposure, and ranked next actions.
- `rag_s2_augmentation_eval_report.md` - canonical fresh `S2` augmentation evaluation report from the standard rerun path.
- `rag_s2_release_eval_report.md` - canonical release-authority `S2` evaluation report used by the advisory gate and release decision.
- `rag_s2_release_decision_report.md` - current explicit default-route decision showing either `promote` or `stay_advisory_only` plus blocker categories.
- `rag_s2_augmentation_eval_probe10_report.md` - first fixed-sample `10`-case diagnostic rerun under corrected chat-enabled release conditions.
- `rag_s2_augmentation_eval_probe10_timeout90_report.md` - clean no-fallback `10`-case diagnostic rerun showing the release scorer still trends slightly negative.
- `rag_s2_release_eval_smoke_report.md` - first live smoke report from the new release-eval runner and contract path.
- `rag_s2_release_eval_limit10_report.md` - first no-fallback `10`-case release-eval diagnostic showing the v1 release contract still compresses `S1` and `S2` to zero delta.
- `rag_s2_release_eval_smoke_chat_report.md` - first chat-enabled smoke report from the release-eval runner under the intended release execution mode.
- `rag_s2_release_eval_slice3_chat_report.md` - first chat-enabled multi-slice release-eval batch showing positive quality delta without fallback noise.
- `rag_s2_release_eval_slice3_chat_v2_report.md` - grouped-anchor / uncertainty-posture slice3 confirmation after the release-contract update.
- `rag_s2_release_eval_limit10_chat_v2_report.md` - broader chat-enabled `10`-case confirmation showing the updated release contract stays positive across all three target slices.
- `rag_s2_advisory_workflow_and_kill_switch_runbook.md` - workflow contract, local rerun sequence, and rollback instructions for advisory-only `S2`.
- `rag_live_benchmark_latest.md` - latest `S1` required metric gate summary used by the `S2` release decision.

## Phase B Production Evidence

- `rag_phase_b_production_evidence_rollout_gate.md` - current rollout gate state for production evidence bundles.
- `rag_phase_b_first_online_rollout_9702.md` - focused first-online verification report for the `9702` rollout.
- `rag_phase_b_first_online_rollout_9231.md` - focused first-online verification report for the `9231` rollout.
- `rag_phase_b_production_evidence_rollout_status.md` - merged rollout health and rollback status surface.
- `rag_evidence_draft_promotion_candidate.md` - latest backend-only reviewed draft promotion candidate summary before any ingest or rollout action.
- `rag_phase_e_promotion_bridge_operator_guide.md` - operator guide for reviewed-candidate to ready-for-ingest promotion, receipt inspection, and Git rollback.

## Coverage And Inventory

- `rag_corpus_source_coverage.md` - corpus source coverage summary for backend RAG.
- `rag_restricted_official_source_inventory.md` - restricted-official inventory snapshot used for governance review.
