import { renderS12BenchmarkReport, summarizeS12Rows } from '../lib/s1_2_benchmark.js';

function createRow(overrides = {}) {
  return {
    case_id: 's1-2-001',
    query_family: 'definition',
    risk_family: 'in_scope_grounded',
    expected_behavior: 'grounded_answer',
    uncertain: false,
    topic_leakage_flag: false,
    topic_leakage_reason: null,
    retrieval_version: 'b_simplified_retrieval_s1_v1',
    retrieval_audit: {
      query_mode: 'hybrid_rpc',
      error_stage: null,
      error_code: null,
      error_details: null,
      rpc_call_count: 1,
      hybrid_row_count: 3,
      dense_row_count: 3,
      lexical_row_count: 2,
    },
    evidence_count: 2,
    resolvable_evidence_count: 2,
    source_ref_unresolvable_count: 0,
    answer_quality_score: 0.9,
    answer_reference_f1: 0.8,
    answer_reference_audit: { tp: 4, fp: 1, fn: 1 },
    answer_keyword_hit_rate: 0.75,
    case_pass: true,
    expected_behavior_match: true,
    contract_failure_reasons: [],
    latency_ms: 120,
    cost_usd: 0.0001,
    error_code: null,
    error_details: null,
    failure_class: 'NONE',
    ...overrides,
  };
}

describe('S1.2 benchmark summary', () => {
  it('renders summary fields and breakdowns without touching S1 artifact paths', () => {
    const summary = summarizeS12Rows(
      [
        createRow(),
        createRow({
          case_id: 's1-2-002',
          expected_behavior: 'uncertain',
          uncertain: true,
          case_pass: true,
          expected_behavior_match: true,
          answer_quality_score: 1,
          answer_reference_audit: { tp: 0, fp: 0, fn: 0 },
          answer_keyword_hit_rate: 1,
          failure_class: 'CONTRACTUAL_UNCERTAIN_EXPECTED',
          query_family: 'worked_solution_request',
          risk_family: 'insufficient_evidence_probe',
        }),
      ],
      {
        benchmark_profile: 'syllabus_qa_core_v1',
        benchmark_tier: 'advisory',
        gold_label_source: 'test',
      },
    );

    expect(summary.dataset).toBe('data/eval/rag_s1_2_syllabus_qa_core_v1.json');
    expect(summary.workflow_source).toBe('.github/workflows/rag-s1-2-benchmark.yml');
    expect(summary.failure_class_breakdown).toEqual({
      NONE: 1,
      CONTRACTUAL_UNCERTAIN_EXPECTED: 1,
    });
    expect(summary.retrieval_audit.query_mode_counts.hybrid_rpc).toBe(2);

    const report = renderS12BenchmarkReport(summary);
    expect(report).toContain('RAG S1.2 Coverage And Diagnostics Benchmark');
    expect(report).toContain('Failure Class Breakdown');
    expect(report).toContain('does not modify `RAG S1` required gates');
  });
});
