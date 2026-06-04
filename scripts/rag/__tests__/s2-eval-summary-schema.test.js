import fs from 'node:fs';
import path from 'node:path';
import {
  buildS2EvalSummarySchemaCheck,
  validateS2EvalSummary,
} from '../lib/s2_eval_summary_schema_check.js';

function buildValidSummary(overrides = {}) {
  const summary = {
    schema_version: 'rag_s2_augmentation_eval_summary_v1',
    generated_at: '2026-06-04T00:00:00.000Z',
    benchmark_profile: 's2_augmentation_eval_v1',
    benchmark_tier: 'advisory',
    dataset: 'data/eval/rag_s2_augmentation_eval_v1.json',
    manifest: 'data/eval/rag_s2_augmentation_eval_v1_manifest.json',
    run_config: {
      script: 'scripts/rag/run_s2_augmentation_eval.js',
      dataset: 'data/eval/rag_s2_augmentation_eval_v1.json',
      manifest: 'data/eval/rag_s2_augmentation_eval_v1_manifest.json',
      selected_cases: 2,
      per_case_timeout_ms: 20000,
      round_timeout_ms: 1200000,
      max_retries: 1,
      s2_enabled: true,
      s2_timeout_ms: 8000,
    },
    inputs: {
      dataset: 'data/eval/rag_s2_augmentation_eval_v1.json',
      manifest: 'data/eval/rag_s2_augmentation_eval_v1_manifest.json',
      corpus_coverage_summary: null,
    },
    status: 'pass',
    total_requests: 2,
    route_counts: { s2_augmentation: 2 },
    retrieval_route_counts: { s2_augmentation: 2 },
    fallback_reason_counts: {},
    s2_empty_evidence_reason_counts: {},
    fallback_rate: 0,
    topic_leakage_rate: 0,
    evidence_traceability_rate: 1,
    target_slice_quality_vs_s1: 0.1,
    target_slice_case_pass_vs_s1: 0,
    target_slice_quality_vs_s1_by_slice: {
      cross_topic: {
        total_requests: 2,
        s1_quality_score: 0.7,
        s2_quality_score: 0.8,
        quality_delta: 0.1,
        s1_case_pass_rate: 1,
        s2_case_pass_rate: 1,
        case_pass_rate_delta: 0,
        s2_fallback_rate: 0,
      },
    },
    readiness_guard_block_count: 0,
    readiness_guard_block_rate: 0,
    readiness_guard_reason_counts: {},
    readiness_effective_depth_source_counts: {},
    dependency_status_counts: { skipped: 2 },
    mode_summaries: {
      s1_baseline: {
        total_requests: 2,
        case_pass_rate: 1,
        answer_quality_score: 0.7,
        uncertain_rate: 0,
        topic_leakage_rate: 0,
        evidence_traceability_rate: 1,
        latency_p95_ms: 100,
        cost_avg_usd_per_req: 0,
        retrieval_route_counts: { s1_default: 2 },
        final_execution_route_counts: { s1_default: 2 },
        query_mode_counts: { hybrid_rpc: 2 },
        fallback_reason_counts: {},
        dependency_status_counts: { skipped: 2 },
        s2_routed_request_count: 0,
        s2_fallback_count: 0,
        fallback_rate: 0,
      },
      s2_enabled: {
        total_requests: 2,
        case_pass_rate: 1,
        answer_quality_score: 0.8,
        uncertain_rate: 0,
        topic_leakage_rate: 0,
        evidence_traceability_rate: 1,
        latency_p95_ms: 100,
        cost_avg_usd_per_req: 0,
        retrieval_route_counts: { s2_augmentation: 2 },
        final_execution_route_counts: { s2_augmentation: 2 },
        query_mode_counts: { hybrid_rpc: 2 },
        fallback_reason_counts: {},
        dependency_status_counts: { skipped: 2 },
        s2_routed_request_count: 2,
        s2_fallback_count: 0,
        fallback_rate: 0,
      },
    },
    top_failing_cases: [],
    release_blockers: [],
  };
  return {
    ...summary,
    ...overrides,
  };
}

describe('S2 eval summary schema check', () => {
  test('passes a release-authority eval summary', () => {
    const result = validateS2EvalSummary(buildValidSummary());

    expect(result.status).toBe('pass');
    expect(result.errors).toEqual([]);
  });

  test('fails when the eval summary is missing', () => {
    const result = buildS2EvalSummarySchemaCheck({ evalSummary: null });

    expect(result.status).toBe('fail');
    expect(result.blocked_reasons).toContain('release_eval_summary_missing');
  });

  test('fails when required schema fields are absent', () => {
    const result = validateS2EvalSummary({
      ...buildValidSummary(),
      schema_version: undefined,
    });

    expect(result.status).toBe('fail');
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'schema_required_field_missing',
          path: 'schema_version',
        }),
      ]),
    );
  });

  test.each([
    ['S2_EMPTY_EVIDENCE', { S2_EMPTY_EVIDENCE: 1 }],
    ['S2_TIMEOUT', { S2_TIMEOUT: 1 }],
  ])('fails when %s is present but status is pass', (_code, fallbackReasonCounts) => {
    const result = validateS2EvalSummary(
      buildValidSummary({
        status: 'pass',
        fallback_reason_counts: fallbackReasonCounts,
        mode_summaries: {
          ...buildValidSummary().mode_summaries,
          s2_enabled: {
            ...buildValidSummary().mode_summaries.s2_enabled,
            fallback_reason_counts: fallbackReasonCounts,
            s2_fallback_count: 1,
            fallback_rate: 0.5,
          },
        },
        fallback_rate: 0.5,
        top_failing_cases: [
          {
            case_id: 's2-aug-timeout-001',
            target_slice: 'cross_topic',
            s2_case_pass: false,
            s2_failure_class: 'S2_FALLBACK',
            s2_fallback_triggered: true,
            s2_fallback_reason: Object.keys(fallbackReasonCounts)[0],
            quality_delta_vs_s1: -0.1,
          },
        ],
      }),
    );

    expect(result.status).toBe('fail');
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'semantic_status_must_not_pass' }),
      ]),
    );
  });

  test('fails when fallback rate does not match routed fallback count', () => {
    const result = validateS2EvalSummary(
      buildValidSummary({
        fallback_rate: 0.25,
        mode_summaries: {
          ...buildValidSummary().mode_summaries,
          s2_enabled: {
            ...buildValidSummary().mode_summaries.s2_enabled,
            s2_routed_request_count: 4,
            s2_fallback_count: 2,
            fallback_rate: 0.5,
          },
        },
      }),
    );

    expect(result.status).toBe('fail');
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'semantic_fallback_rate_mismatch' }),
      ]),
    );
  });

  test('fails when blocking fallback counts have no top failing cases', () => {
    const result = validateS2EvalSummary(
      buildValidSummary({
        status: 'fail',
        fallback_reason_counts: { S2_TIMEOUT: 1 },
        fallback_rate: 0.5,
        mode_summaries: {
          ...buildValidSummary().mode_summaries,
          s2_enabled: {
            ...buildValidSummary().mode_summaries.s2_enabled,
            fallback_reason_counts: { S2_TIMEOUT: 1 },
            s2_fallback_count: 1,
            fallback_rate: 0.5,
          },
        },
        top_failing_cases: [],
      }),
    );

    expect(result.status).toBe('fail');
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'semantic_top_failing_cases_missing' }),
      ]),
    );
  });

  test('CLI check writes a failure artifact for a missing summary path', async () => {
    const tmpDir = fs.mkdtempSync(path.join('/tmp', 's2-eval-schema-check-'));
    const outFile = path.join(tmpDir, 'check.json');
    const { main } = await import('../run_s2_eval_summary_schema_check.js');

    const exitCode = main([
      '--summary',
      path.join(tmpDir, 'missing.json'),
      '--out',
      outFile,
    ]);
    const payload = JSON.parse(fs.readFileSync(outFile, 'utf8'));

    expect(exitCode).toBe(1);
    expect(payload.status).toBe('fail');
    expect(payload.blocked_reasons).toContain('release_eval_summary_missing');
  });
});
