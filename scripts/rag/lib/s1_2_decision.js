function topBreakdownEntries(breakdown = {}, { limit = 5 } = {}) {
  return Object.entries(breakdown)
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .slice(0, limit)
    .map(([key, value]) => ({ key, value }));
}

export function buildRemediationMap(benchmarkSummary = {}, corpusAuditSummary = {}) {
  const failureBreakdown = benchmarkSummary.failure_class_breakdown || {};
  const corpusAnomalies = corpusAuditSummary.anomaly_counts || {};
  const mappings = [];

  if (Number(failureBreakdown.BOUNDARY_LOOKUP_FAILURE || 0) > 0) {
    mappings.push({
      failure_family: 'BOUNDARY_LOOKUP_FAILURE',
      remediation: 'stabilize boundary resolver and upstream curriculum_nodes lookup path before any retrieval upgrade',
    });
  }
  if (Number(failureBreakdown.RETRIEVER_INFRA_FAILURE || 0) > 0) {
    mappings.push({
      failure_family: 'RETRIEVER_INFRA_FAILURE',
      remediation: 'fix retrieval RPC reliability and upstream DB/network error handling before tuning quality',
    });
  }
  if (Number(failureBreakdown.SOURCE_REF_MISSING || 0) > 0 || Number(corpusAnomalies.unresolvable_source_ref || 0) > 0) {
    mappings.push({
      failure_family: 'SOURCE_REF_MISSING',
      remediation: 'formalize source_ref provenance and source metadata before broader strategy upgrades',
    });
  }
  if (Number(failureBreakdown.NO_RELEVANT_CHUNK || 0) > 0) {
    mappings.push({
      failure_family: 'NO_RELEVANT_CHUNK',
      remediation: 'audit corpus coverage and chunk/schema quality before attempting a new retrieval architecture',
    });
  }
  if (Number(failureBreakdown.KEYWORD_PATH_WEAK || 0) > 0) {
    mappings.push({
      failure_family: 'KEYWORD_PATH_WEAK',
      remediation: 'inspect keyword normalization, FTS coverage, and lexical weighting',
    });
  }
  if (Number(failureBreakdown.SEMANTIC_PATH_WEAK || 0) > 0) {
    mappings.push({
      failure_family: 'SEMANTIC_PATH_WEAK',
      remediation: 'inspect embedding quality and semantic recall before expanding architecture scope',
    });
  }
  if (Number(failureBreakdown.RERANK_OR_FUSION_MISS || 0) > 0) {
    mappings.push({
      failure_family: 'RERANK_OR_FUSION_MISS',
      remediation: 'tune fused ranking and prompt contract before considering S2',
    });
  }
  if (Number(corpusAnomalies.missing_explicit_corpus_version || 0) > 0) {
    mappings.push({
      failure_family: 'MISSING_EXPLICIT_CORPUS_VERSION',
      remediation: 'introduce explicit corpus_version recording before any major ingest/chunking migration',
    });
  }
  if (Number(corpusAnomalies.empty_corpus || 0) > 0) {
    mappings.push({
      failure_family: 'EMPTY_CORPUS',
      remediation: 'audit ingest target tables and seed coverage before tuning retrieval or proposing S2',
    });
  }

  return mappings;
}

export function buildS12Decision(benchmarkSummary = {}, corpusAuditSummary = {}) {
  const failureBreakdown = benchmarkSummary.failure_class_breakdown || {};
  const totalFailures = Object.entries(failureBreakdown)
    .filter(([key]) => key !== 'NONE' && key !== 'CONTRACTUAL_UNCERTAIN_EXPECTED')
    .reduce((sum, [, value]) => sum + Number(value || 0), 0);

  const severeCorpusSignals =
    Boolean(corpusAuditSummary.metrics?.empty_corpus) ||
    Number(corpusAuditSummary.anomaly_counts?.unresolvable_source_ref || 0) > 0 ||
    Number(corpusAuditSummary.anomaly_counts?.missing_topic_path || 0) > 0 ||
    Number(corpusAuditSummary.metrics?.explicit_corpus_version_coverage_rate || 0) < 0.5;

  const severeInfraSignals =
    Number(failureBreakdown.BOUNDARY_LOOKUP_FAILURE || 0) > 0 ||
    Number(failureBreakdown.RETRIEVER_INFRA_FAILURE || 0) > 0;

  const eligibleForS2ResearchSpec = false;
  let decision = 'keep_s1_default_and_continue_s1_tuning';
  let rationale =
    'Current S1.2 evidence does not justify a GraphRAG jump. Keep S1 as default and continue evidence-driven tuning.';

  if (severeInfraSignals) {
    decision = 'prepare_corpus_or_chunking_spec';
    rationale =
      'Observed failures still include infrastructure-layer signals. Stabilize retrieval/boundary/corpus contracts before any S2 research branch.';
  } else if (severeCorpusSignals && totalFailures > 0) {
    decision = 'prepare_corpus_or_chunking_spec';
    rationale =
      'Current failure profile points to corpus/schema/provenance debt ahead of architecture debt. Prepare a corpus/chunking spec first.';
  } else if (eligibleForS2ResearchSpec) {
    decision = 'eligible_for_s2_research_spec';
    rationale =
      'Failures concentrate in cross-topic reasoning patterns that are not explained by infra, corpus, or fusion defects.';
  }

  return {
    decision,
    rationale,
    eligible_for_s2_research_spec: eligibleForS2ResearchSpec,
    s2_blockers: [
      'No dedicated cross-topic / prerequisite-chain evidence set in S1.2',
      'Current evidence does not prove GraphRAG-only failure modes',
      'S1 remains the default required-gate path',
    ],
    failure_class_breakdown_top: topBreakdownEntries(failureBreakdown),
    corpus_anomaly_counts: corpusAuditSummary.anomaly_counts || {},
    remediation_map: buildRemediationMap(benchmarkSummary, corpusAuditSummary),
  };
}

export function renderS12DecisionReport({ benchmarkSummary, corpusAuditSummary, decisionPayload }) {
  const lines = [
    '# RAG S1.2 Decision Report',
    '',
    `- Generated at: \`${new Date().toISOString()}\``,
    `- Benchmark summary: \`runs/backend/rag_s1_2_benchmark_summary.json\``,
    `- Corpus audit summary: \`runs/backend/rag_corpus_audit_summary.json\``,
    `- Decision: \`${decisionPayload.decision}\``,
    '',
    '## Decision',
    '',
    `- Rationale: ${decisionPayload.rationale}`,
    `- Eligible for S2 research spec: \`${decisionPayload.eligible_for_s2_research_spec}\``,
    '',
    '## Why Not GraphRAG Now',
    '',
  ];

  for (const blocker of decisionPayload.s2_blockers) {
    lines.push(`- ${blocker}`);
  }

  lines.push(
    '',
    '## Benchmark Highlights',
    '',
    `- overall_case_pass_rate: \`${((benchmarkSummary.metrics?.overall_case_pass_rate || 0) * 100).toFixed(2)}%\``,
    `- topic_leakage_rate: \`${((benchmarkSummary.metrics?.topic_leakage_rate || 0) * 100).toFixed(2)}%\``,
    `- evidence_traceability_rate: \`${((benchmarkSummary.metrics?.evidence_traceability_rate || 0) * 100).toFixed(2)}%\``,
    '',
    '## Corpus Audit Highlights',
    '',
    `- empty_corpus: \`${Boolean(corpusAuditSummary.metrics?.empty_corpus)}\``,
    `- source_ref_resolvability_rate: \`${((corpusAuditSummary.metrics?.source_ref_resolvability_rate || 0) * 100).toFixed(2)}%\``,
    `- explicit_corpus_version_coverage_rate: \`${((corpusAuditSummary.metrics?.explicit_corpus_version_coverage_rate || 0) * 100).toFixed(2)}%\``,
    '',
    '## Top Failure Families -> Remediation',
    '',
  );

  if ((decisionPayload.remediation_map || []).length === 0) {
    lines.push('- None');
  } else {
    for (const item of decisionPayload.remediation_map) {
      lines.push(`- \`${item.failure_family}\`: ${item.remediation}`);
    }
  }

  lines.push(
    '',
    '## Decision Set Guard',
    '',
    '- Allowed decision set:',
    '  - `keep_s1_default_and_continue_s1_tuning`',
    '  - `prepare_corpus_or_chunking_spec`',
    '  - `eligible_for_s2_research_spec`',
    '',
  );

  return lines.join('\n');
}
