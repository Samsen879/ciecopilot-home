function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildBlockingReasons(checks = {}, context = {}) {
  const reasons = [];
  if (!checks.nodes_critical_rate) {
    reasons.push(
      `curriculum_nodes critical_rate exceeded threshold: ${toNumber(context.nodes?.rates?.critical_rate, 0)}`,
    );
  }
  if (!checks.nodes_benchmark_critical_open_items) {
    reasons.push('curriculum_nodes has unresolved critical items in benchmark-covered nodes');
  }
  if (!checks.corpus_required_source_types) {
    reasons.push('canonical corpus missing required source_type coverage (note_md/past_paper_pdf/mark_scheme_pdf)');
  }
  if (!checks.corpus_source_ref_resolvability_rate) {
    reasons.push('source_ref resolvability rate below threshold');
  }
  if (!checks.corpus_topic_path_coverage_rate) {
    reasons.push('topic_path coverage rate below threshold');
  }
  if (!checks.forced_topic_leakage_rate) {
    reasons.push('forced retrieval benchmark detected topic leakage');
  }
  if (!checks.forced_evidence_traceability_rate) {
    reasons.push('forced retrieval evidence traceability below threshold');
  }
  if (!checks.forced_retrieval_path_ratio) {
    reasons.push('forced retrieval path ratio below threshold');
  }
  if (!checks.forced_short_circuit_ratio) {
    reasons.push('forced short_circuit ratio above threshold');
  }
  if (!checks.forced_no_relevant_chunk_rate) {
    reasons.push('forced NO_RELEVANT_CHUNK ratio above threshold');
  }
  if (!checks.forced_infra_failure_rate) {
    reasons.push('forced retrieval benchmark infra failure rate above threshold');
  }
  return reasons;
}

function renderHardGateRows(checks = {}) {
  return Object.entries(checks).map(([key, value]) => `- ${key}: \`${Boolean(value)}\``);
}

export function buildS13Decision({
  nodesAudit = null,
  corpusCoverage = null,
  forcedBenchmark = null,
} = {}) {
  const hardGateChecks = {
    nodes_critical_rate: Boolean(nodesAudit?.threshold_checks?.critical_rate_lte_0_5_percent),
    nodes_benchmark_critical_open_items: Boolean(
      nodesAudit?.threshold_checks?.benchmark_critical_open_items_zero,
    ),
    corpus_required_source_types: Boolean(corpusCoverage?.threshold_checks?.required_source_types_all_present),
    corpus_source_ref_resolvability_rate: Boolean(corpusCoverage?.threshold_checks?.source_ref_resolvability_rate),
    corpus_topic_path_coverage_rate: Boolean(corpusCoverage?.threshold_checks?.topic_path_coverage_rate),
    forced_topic_leakage_rate: Boolean(forcedBenchmark?.threshold_checks?.topic_leakage_rate),
    forced_evidence_traceability_rate: Boolean(
      forcedBenchmark?.threshold_checks?.evidence_traceability_rate,
    ),
    forced_retrieval_path_ratio: Boolean(forcedBenchmark?.threshold_checks?.retrieval_path_ratio),
    forced_short_circuit_ratio: Boolean(forcedBenchmark?.threshold_checks?.short_circuit_ratio),
    forced_no_relevant_chunk_rate: Boolean(forcedBenchmark?.threshold_checks?.no_relevant_chunk_rate),
    forced_infra_failure_rate: Boolean(forcedBenchmark?.threshold_checks?.infra_failure_rate),
  };

  const allHardGatesPassed = Object.values(hardGateChecks).every(Boolean);
  const principalFailureDomain = forcedBenchmark?.principal_failure_domain || 'unknown';
  const dataDominatedFailure = principalFailureDomain === 'data' || principalFailureDomain === 'mixed';
  const infraDominatedFailure = principalFailureDomain === 'retrieval_or_infra';
  const failureProfileSupportsS2 = principalFailureDomain === 'cross_topic_global_reasoning';

  const noGoConditionsTriggered = {
    unresolved_node_critical_issues: !hardGateChecks.nodes_critical_rate || !hardGateChecks.nodes_benchmark_critical_open_items,
    canonical_source_type_or_traceability_gap:
      !hardGateChecks.corpus_required_source_types || !hardGateChecks.corpus_source_ref_resolvability_rate,
    canonical_topic_path_mapping_gap: !hardGateChecks.corpus_topic_path_coverage_rate,
    forced_retrieval_threshold_gap:
      !hardGateChecks.forced_retrieval_path_ratio ||
      !hardGateChecks.forced_short_circuit_ratio ||
      !hardGateChecks.forced_no_relevant_chunk_rate ||
      !hardGateChecks.forced_infra_failure_rate ||
      !hardGateChecks.forced_topic_leakage_rate ||
      !hardGateChecks.forced_evidence_traceability_rate,
    data_is_still_primary_failure_domain: dataDominatedFailure,
    infra_is_still_primary_failure_domain: infraDominatedFailure,
    failure_profile_not_cross_topic_global: !failureProfileSupportsS2,
  };

  const decision =
    allHardGatesPassed && failureProfileSupportsS2 && !dataDominatedFailure && !infraDominatedFailure
      ? 'go_s2_candidate'
      : 'no_go_continue_s1_data_governance';

  const blockingReasons = buildBlockingReasons(hardGateChecks, {
    nodes: nodesAudit,
    corpus: corpusCoverage,
    forced: forcedBenchmark,
  });
  if (infraDominatedFailure) {
    blockingReasons.push('principal failure domain is retrieval_or_infra, not cross-topic reasoning');
  }
  if (dataDominatedFailure) {
    blockingReasons.push('principal failure domain still includes data governance debt');
  }
  if (!failureProfileSupportsS2) {
    blockingReasons.push('failure profile does not justify S2 (cross-topic/global reasoning) yet');
  }

  const nextActions =
    decision === 'go_s2_candidate'
      ? [
          'create S2 requirements/design scoped to cross-topic/global reasoning only',
          'keep S1 required gates unchanged while introducing S2 as augmentation route',
        ]
      : [
          'continue S1 data governance (topic_path mapping + source provenance hardening)',
          'expand canonical population for missing assets and rerun forced retrieval benchmark',
        ];

  return {
    generated_at: new Date().toISOString(),
    decision,
    hard_gate_checks: hardGateChecks,
    all_hard_gates_passed: allHardGatesPassed,
    principal_failure_domain: principalFailureDomain,
    go_conditions: {
      all_hard_gates_passed: allHardGatesPassed,
      failure_domain_not_data: !dataDominatedFailure,
    },
    no_go_conditions_triggered: noGoConditionsTriggered,
    blocking_reasons: blockingReasons,
    next_actions: nextActions,
  };
}

export function renderS13TrustReport({
  nodesAudit,
  corpusCoverage,
  forcedBenchmark,
  decision,
  sourcePaths,
}) {
  const lines = [
    '# RAG S1.3 Data Source Trust Report',
    '',
    '- Version: `v1.0`',
    `- Date: \`${new Date().toISOString()}\``,
    `- Status: \`${decision.decision === 'go_s2_candidate' ? 'Go' : 'No-Go'}\``,
    '- Scope: `S1.3 data-source trust + forced retrieval coverage + S2 Go/No-Go`',
    '',
    '## 1. Node Trust (curriculum_nodes)',
    '',
    `- Source artifact: \`${sourcePaths.nodesAudit}\``,
    `- total_nodes: \`${nodesAudit?.totals?.total_nodes ?? 'n/a'}\``,
    `- manual_sample_issues: \`${nodesAudit?.totals?.manual_sample_issues ?? 'n/a'}\``,
    `- critical_rate: \`${((toNumber(nodesAudit?.rates?.critical_rate, 0) || 0) * 100).toFixed(3)}%\``,
    `- threshold critical<=0.5%: \`${nodesAudit?.threshold_checks?.critical_rate_lte_0_5_percent}\``,
    `- benchmark critical open items == 0: \`${nodesAudit?.threshold_checks?.benchmark_critical_open_items_zero}\``,
    '',
    '## 2. Canonical Source Coverage',
    '',
    `- Source artifact: \`${sourcePaths.corpusCoverage}\``,
    `- source_type_counts: \`${JSON.stringify(corpusCoverage?.source_type_counts || {})}\``,
    `- source_ref_resolvability_rate: \`${((toNumber(corpusCoverage?.metrics?.source_ref_resolvability_rate, 0) || 0) * 100).toFixed(2)}%\``,
    `- topic_path_coverage_rate: \`${((toNumber(corpusCoverage?.metrics?.topic_path_coverage_rate, 0) || 0) * 100).toFixed(2)}%\``,
    `- required source types all present: \`${corpusCoverage?.threshold_checks?.required_source_types_all_present}\``,
    '',
    '## 3. Forced Retrieval Benchmark',
    '',
    `- Source artifact: \`${sourcePaths.forcedBenchmark}\``,
    `- benchmark_profile: \`${forcedBenchmark?.benchmark_profile || 'unknown'}\``,
    `- total_requests: \`${forcedBenchmark?.total_requests || 0}\``,
    `- topic_leakage_rate: \`${((toNumber(forcedBenchmark?.metrics?.topic_leakage_rate, 0) || 0) * 100).toFixed(2)}%\``,
    `- evidence_traceability_rate: \`${((toNumber(forcedBenchmark?.metrics?.evidence_traceability_rate, 0) || 0) * 100).toFixed(2)}%\``,
    `- retrieval_path_ratio: \`${((toNumber(forcedBenchmark?.metrics?.retrieval_path_ratio, 0) || 0) * 100).toFixed(2)}%\``,
    `- short_circuit_ratio: \`${((toNumber(forcedBenchmark?.metrics?.short_circuit_ratio, 0) || 0) * 100).toFixed(2)}%\``,
    `- no_relevant_chunk_rate: \`${((toNumber(forcedBenchmark?.metrics?.no_relevant_chunk_rate, 0) || 0) * 100).toFixed(2)}%\``,
    `- principal_failure_domain: \`${forcedBenchmark?.principal_failure_domain || 'unknown'}\``,
    '',
    '## 4. S2 Go/No-Go Decision',
    '',
    `- Decision: \`${decision.decision}\``,
    `- all_hard_gates_passed: \`${decision.all_hard_gates_passed}\``,
    '',
    '### Hard Gate Checks',
    '',
    ...renderHardGateRows(decision.hard_gate_checks),
    '',
    '### Blocking Reasons',
    '',
  ];

  if (!Array.isArray(decision.blocking_reasons) || decision.blocking_reasons.length === 0) {
    lines.push('- none');
  } else {
    for (const reason of decision.blocking_reasons) {
      lines.push(`- ${reason}`);
    }
  }

  lines.push('', '### Next Actions', '');
  for (const action of decision.next_actions || []) {
    lines.push(`- ${action}`);
  }

  return `${lines.join('\n')}\n`;
}
