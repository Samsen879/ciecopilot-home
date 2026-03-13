import { buildS13Decision, renderS13TrustReport } from '../lib/s1_3_decision.js';

describe('S1.3 decision', () => {
  it('renders blocking reason from coverage artifact required_source_types', () => {
    const decision = buildS13Decision({
      nodesAudit: {
        threshold_checks: {
          critical_rate_lte_0_5_percent: true,
          benchmark_critical_open_items_zero: true,
        },
      },
      corpusCoverage: {
        required_source_types: ['past_paper_pdf', 'mark_scheme_pdf'],
        threshold_checks: {
          required_source_types_all_present: false,
          source_ref_resolvability_rate: true,
          topic_path_coverage_rate: true,
        },
      },
      forcedBenchmark: {
        threshold_checks: {
          topic_leakage_rate: true,
          evidence_traceability_rate: true,
          retrieval_path_ratio: true,
          short_circuit_ratio: true,
          no_relevant_chunk_rate: true,
          infra_failure_rate: true,
        },
        principal_failure_domain: 'cross_topic_global_reasoning',
      },
    });

    expect(decision.blocking_reasons).toContain(
      'canonical corpus missing required source_type coverage (past_paper_pdf/mark_scheme_pdf)',
    );
  });

  it('includes policy metadata in trust report when available', () => {
    const report = renderS13TrustReport({
      nodesAudit: {
        totals: { total_nodes: 1, manual_sample_issues: 0 },
        rates: { critical_rate: 0 },
        threshold_checks: {
          critical_rate_lte_0_5_percent: true,
          benchmark_critical_open_items_zero: true,
        },
      },
      corpusCoverage: {
        source_type_counts: { past_paper_pdf: 1, mark_scheme_pdf: 1 },
        required_source_types: ['past_paper_pdf', 'mark_scheme_pdf'],
        policy: {
          mode: 'production',
          required_source_types: ['past_paper_pdf', 'mark_scheme_pdf'],
        },
        metrics: {
          source_ref_resolvability_rate: 1,
          topic_path_coverage_rate: 1,
        },
        threshold_checks: {
          required_source_types_all_present: true,
        },
      },
      forcedBenchmark: {
        benchmark_profile: 'forced_v1',
        total_requests: 1,
        metrics: {
          topic_leakage_rate: 0,
          evidence_traceability_rate: 1,
          retrieval_path_ratio: 1,
          short_circuit_ratio: 0,
          no_relevant_chunk_rate: 0,
        },
        principal_failure_domain: 'cross_topic_global_reasoning',
      },
      decision: {
        decision: 'go_s2_candidate',
        all_hard_gates_passed: true,
        hard_gate_checks: {},
        blocking_reasons: [],
        next_actions: [],
      },
      sourcePaths: {
        nodesAudit: 'runs/backend/nodes.json',
        corpusCoverage: 'runs/backend/corpus.json',
        forcedBenchmark: 'runs/backend/forced.json',
      },
    });

    expect(report).toContain('- policy_mode: `production`');
    expect(report).toContain('- policy_required_source_types: `["past_paper_pdf","mark_scheme_pdf"]`');
  });
});
