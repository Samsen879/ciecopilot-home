import {
  evaluateS2AugmentationCase,
  renderS2AugmentationEvalReport,
  summarizeS2AugmentationEval,
} from '../lib/s2_augmentation_eval.js';

function buildCase(overrides = {}) {
  return {
    case_id: 's2-aug-001',
    syllabus_node_id: 'node-1',
    current_topic_path: '9709.P1',
    subject_code: '9709',
    target_slice: 'cross_topic',
    query_family: 'cross_topic_linking',
    expected_behavior: 's2_augmentation_candidate',
    query: 'Compare two topics across chapters.',
    reference_answer: 'Pure Mathematics 1 and Pure Mathematics 3',
    expected_answer_keywords: ['pure', 'mathematics'],
    min_answer_score: 0.3,
    ...overrides,
  };
}

function buildResponse(overrides = {}) {
  return {
    answer: 'Pure Mathematics 1 links to Pure Mathematics 3.',
    uncertain: false,
    uncertain_reason_code: null,
    topic_leakage_flag: false,
    topic_leakage_reason: null,
    evidence: [
      {
        id: 'chunk-1',
        topic_path: '9709.P1',
        snippet: 'snippet',
        score: 0.8,
        source_type: 'chunk',
        source_ref: {
          asset_id: 'chunk-1',
          question_id: 'q1',
        },
      },
    ],
    retrieval_version: 'b_simplified_retrieval_s1_v1',
    metrics: {
      evidence_traceability_rate: 1,
      cost_avg_usd_per_req: 0.0001,
      cost_audit: null,
      retrieval_audit: {
        query_mode: 'hybrid_rpc',
        rpc_call_count: 1,
      },
      route_audit: {
        retrieval_route: 's2_augmentation',
        route_stage: 'rules',
        final_execution_route: 's2_augmentation',
        fallback_triggered: false,
        fallback_reason: null,
      },
      latency_ms: 120,
    },
    ...overrides,
  };
}

describe('S2 augmentation eval summary', () => {
  it('summarizes S1 vs S2 and renders report', () => {
    const item = buildCase();
    const s1Row = evaluateS2AugmentationCase(
      item,
      buildResponse({
        answer: 'Completely unrelated answer.',
        metrics: {
          ...buildResponse().metrics,
          route_audit: {
            retrieval_route: 's1_default',
            route_stage: 'default_safe',
            final_execution_route: 's1_default',
            fallback_triggered: false,
            fallback_reason: null,
          },
        },
      }),
      { mode: 's1_baseline' },
    );

    const s2Row = evaluateS2AugmentationCase(item, buildResponse(), { mode: 's2_enabled' });
    const summary = summarizeS2AugmentationEval({
      s1Rows: [s1Row],
      s2Rows: [s2Row],
      dataset: 'data/eval/rag_s2_augmentation_eval_v1.json',
      manifest: { benchmark_profile: 's2_augmentation_eval_v1' },
      runConfig: {
        manifest: 'data/eval/rag_s2_augmentation_eval_v1_manifest.json',
      },
      corpusCoverageSummary: {
        corpus_version_counts: {
          rag_corpus_unification_20260303: 10,
        },
      },
    });

    expect(summary.route_counts.s2_augmentation).toBe(1);
    expect(summary.schema_version).toBe('rag_s2_augmentation_eval_summary_v1');
    expect(summary.fallback_rate).toBe(0);
    expect(summary.s2_empty_evidence_reason_counts).toEqual({});
    expect(summary.topic_leakage_rate).toBe(0);
    expect(summary.evidence_traceability_rate).toBe(1);
    expect(summary.corpus_version).toBe('rag_corpus_unification_20260303');
    expect(summary.mode_summaries.s2_enabled.total_requests).toBe(1);
    expect(summary.release_blockers).toEqual([]);

    const report = renderS2AugmentationEvalReport(summary);
    expect(report).toContain('RAG S2 Augmentation Eval Report');
    expect(report).toContain('fallback_rate');
    expect(report).toContain('S2 Empty Evidence Breakdown');
    expect(report).toContain('Top Failing Cases');
  });

  it('keeps failing S2 readiness evidence out of pass status', () => {
    const item = buildCase();
    const s1Row = evaluateS2AugmentationCase(item, buildResponse(), { mode: 's1_baseline' });
    const s2Row = evaluateS2AugmentationCase(
      item,
      buildResponse({
        answer: '',
        evidence: [],
        metrics: {
          ...buildResponse().metrics,
          route_audit: {
            retrieval_route: 's2_augmentation',
            route_stage: 'default_safe',
            final_execution_route: 's1_default',
            fallback_triggered: true,
            fallback_reason: 'S2_TIMEOUT',
          },
        },
      }),
      { mode: 's2_enabled' },
    );

    const summary = summarizeS2AugmentationEval({
      s1Rows: [s1Row],
      s2Rows: [s2Row],
      dataset: 'data/eval/rag_s2_augmentation_eval_v1.json',
      manifest: { benchmark_profile: 's2_augmentation_eval_v1' },
      runConfig: {
        manifest: 'data/eval/rag_s2_augmentation_eval_v1_manifest.json',
      },
    });

    expect(summary.status).toBe('fail');
    expect(summary.fallback_reason_counts.S2_TIMEOUT).toBe(1);
    expect(summary.release_blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 's2_timeout_present' }),
        expect.objectContaining({ code: 'fallback_rate_above_threshold' }),
        expect.objectContaining({ code: 'target_slice_quality_non_positive' }),
      ]),
    );
  });
});
