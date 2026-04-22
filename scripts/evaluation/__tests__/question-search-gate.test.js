import path from 'node:path';
import { jest } from '@jest/globals';

import {
  buildCurriculumNodeResolutionSql,
  buildGateCommand,
  DEFAULT_CURRICULUM_VERSION_TAG,
  DEFAULT_QUESTION_SEARCH_GATE_THRESHOLDS,
  getProjectionSearchMode,
  loadQuestionSearchGoldFixture,
  parseQuestionSearchGateArgs,
  resolveQuestionSearchGatePsqlConfig,
  runQuestionSearchGate,
  selectSupabaseDbContainerName,
  searchProjectionFromDatabase,
} from '../run_question_search_gate.js';

const FIXTURE_PATH = path.join(
  process.cwd(),
  'data',
  'eval',
  'question_search_gold_9709_v1.json',
);

describe('question-search-gate', () => {
  test('checked-in gold fixture stays small and includes pinned paper-backed and imported fallback cases', () => {
    const fixture = loadQuestionSearchGoldFixture(FIXTURE_PATH);

    expect(fixture.subject_code).toBe('9709');
    expect(fixture.curriculum_version_tag).toBe(DEFAULT_CURRICULUM_VERSION_TAG);
    expect(fixture.cases.length).toBeLessThanOrEqual(6);
    expect(
      fixture.cases.some((testCase) => (
        testCase.expected.match.source_kind === 'imported_question'
        && testCase.expected.summary_policy === 'allow_null'
      )),
    ).toBe(true);
    expect(
      fixture.cases.some((testCase) => (
        typeof testCase.query.topic_path === 'string'
        && Number.isInteger(testCase.query.year)
        && Number.isInteger(testCase.query.paper_number)
      )),
    ).toBe(true);
    expect(
      fixture.cases.some((testCase) => testCase.id === 'mixed-ranking-paper-authority'),
    ).toBe(true);
    expect(
      fixture.cases.find((testCase) => testCase.id === 'mixed-ranking-paper-authority'),
    ).toEqual(expect.objectContaining({
      expected: expect.objectContaining({
        match: expect.objectContaining({
          source_kind: 'paper_question',
          primary_question_type_id: '9709.trigonometry.identities',
        }),
      }),
    }));
    expect(
      fixture.cases.find((testCase) => testCase.id === 'mixed-ranking-paper-authority')?.expected?.match,
    ).not.toHaveProperty('q_number');
  });

  test('runQuestionSearchGate computes release metrics and passes when thresholds are met', async () => {
    const fixture = {
      subject_code: '9709',
      curriculum_version_tag: DEFAULT_CURRICULUM_VERSION_TAG,
      thresholds: {
        exact_structured_match_rate: 0.9,
        subject_leakage_rate: 0,
        metadata_completeness_rate: 0.95,
        null_summary_rate: 0.05,
      },
      cases: [
        {
          id: 'imported-fallback-browser-repair',
          description: 'Imported fallback rows stay retrievable through prompt-backed search_text.',
          query: {
            topic_path: '9709.codex_cli.browser_fixture.repair',
            primary_question_type_id: '9709.trigonometry.equations',
            q_number: 1,
            query: '2cos(2x)-3sin x',
          },
          expected: {
            match: {
              question_id: 'question-imported-1',
              source_kind: 'imported_question',
              subject_code: '9709',
              primary_topic_path: '9709.codex_cli.browser_fixture.repair',
              primary_question_type_id: '9709.trigonometry.equations',
              family_id: '9709.trigonometry_manipulation_equations',
              q_number: 1,
            },
            required_metadata: [
              'question_id',
              'source_kind',
              'subject_code',
              'primary_topic_path',
              'primary_question_type_id',
              'family_id',
              'q_number',
              'search_text',
            ],
            summary_policy: 'allow_null',
          },
        },
        {
          id: 'paper-pin-s19-p1-q6',
          description: 'Paper-backed trigonometry retrieval keeps topic, paper, year, and question number aligned.',
          query: {
            topic_path: '9709.p1.trigonometry',
            year: 2019,
            session: 's',
            paper_number: 1,
            q_number: 6,
            query: 'Prove trigonometric identity',
          },
          expected: {
            match: {
              question_id: 'question-paper-1',
              source_kind: 'paper_question',
              subject_code: '9709',
              primary_topic_path: '9709.p1.trigonometry',
              year: 2019,
              session: 's',
              paper_number: 1,
              q_number: 6,
            },
            required_metadata: [
              'question_id',
              'source_kind',
              'subject_code',
              'primary_topic_path',
              'year',
              'session',
              'paper_number',
              'q_number',
              'summary',
            ],
            summary_policy: 'require_non_null',
          },
        },
      ],
    };

    const searchQuestionsFn = jest.fn()
      .mockResolvedValueOnce({
        items: [
          {
            question_id: 'question-imported-1',
            source_kind: 'imported_question',
            subject_code: '9709',
            primary_topic_path: '9709.codex_cli.browser_fixture.repair',
            primary_question_type_id: '9709.trigonometry.equations',
            family_id: '9709.trigonometry_manipulation_equations',
            q_number: 1,
            summary: null,
            search_text: 'Solve 2cos(2x)-3sin x=0 for 0<=x<=180 degrees.',
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      })
      .mockResolvedValueOnce({
        items: [
          {
            question_id: 'question-paper-1',
            source_kind: 'paper_question',
            subject_code: '9709',
            primary_topic_path: '9709.p1.trigonometry',
            year: 2019,
            session: 's',
            paper_number: 1,
            q_number: 6,
            summary: 'Prove a trigonometric identity and solve the resulting equation.',
            search_text: 'Prove trigonometric identity and solve equation using it within given domain.',
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      });

    const resolveTopicPathFn = jest.fn(({ topicPath }) => {
      if (topicPath === '9709.codex_cli.browser_fixture.repair') {
        return Promise.resolve('topic-browser-repair');
      }
      if (topicPath === '9709.p1.trigonometry') {
        return Promise.resolve('topic-paper-trigonometry');
      }
      return Promise.resolve(null);
    });

    const inspectDescriptorSourceFn = jest.fn().mockResolvedValue({
      selected_branch: 'question_descriptions_v0_status_ok',
      surfaces: {
        question_descriptions_prod_v1: { exists: false, count: null, count_9709: null },
        question_descriptions_v1: { exists: false, count: null, count_9709: null },
        question_descriptions_v0: { exists: true, count: 24, count_9709: 24 },
        learning_question_search_projection: { count: 24, count_9709: 24 },
        question_bank_9709: { total: 24, paper_question: 22, imported_question: 2 },
      },
    });

    const result = await runQuestionSearchGate({
      fixture,
      fixturePath: 'data/eval/question_search_gold_9709_v1.json',
      gateCommand: 'node scripts/evaluation/run_question_search_gate.js --fixture data/eval/question_search_gold_9709_v1.json --report docs/reports/2026-04-15-question-search-slice-v1-report.md',
      searchQuestionsFn,
      resolveTopicPathFn,
      inspectDescriptorSourceFn,
      nowIso: '2026-04-15T08:30:00Z',
    });

    expect(resolveTopicPathFn).toHaveBeenCalledWith({
      subjectCode: '9709',
      topicPath: '9709.codex_cli.browser_fixture.repair',
      curriculumVersionTag: DEFAULT_CURRICULUM_VERSION_TAG,
    });
    expect(resolveTopicPathFn).toHaveBeenCalledWith({
      subjectCode: '9709',
      topicPath: '9709.p1.trigonometry',
      curriculumVersionTag: DEFAULT_CURRICULUM_VERSION_TAG,
    });
    expect(searchQuestionsFn).toHaveBeenNthCalledWith(1, {
      subject_code: '9709',
      primary_topic_id: 'topic-browser-repair',
      primary_question_type_id: '9709.trigonometry.equations',
      q_number: 1,
      query: '2cos(2x)-3sin x',
    });
    expect(searchQuestionsFn).toHaveBeenNthCalledWith(2, {
      subject_code: '9709',
      primary_topic_id: 'topic-paper-trigonometry',
      year: 2019,
      session: 's',
      paper_number: 1,
      q_number: 6,
      query: 'Prove trigonometric identity',
    });

    expect(result.metrics).toEqual({
      exact_structured_match_rate: 1,
      subject_leakage_rate: 0,
      metadata_completeness_rate: 1,
      null_summary_rate: 0,
    });
    expect(result.gate.pass).toBe(true);
    expect(result.gate.failing_checks).toEqual([]);
    expect(result.case_results.map((item) => item.id)).toEqual([
      'imported-fallback-browser-repair',
      'paper-pin-s19-p1-q6',
    ]);
    expect(result.report_markdown).toContain('## Runner Output');
    expect(result.report_markdown).toContain('Descriptor Source');
    expect(result.report_markdown).toContain('question_descriptions_v1');
    expect(result.report_markdown).toContain('Frozen Descriptor Fallback Contract');
    expect(result.report_markdown).toContain('Threshold Results');
    expect(result.report_markdown).toContain('Residual Risks');
  });

  test('runQuestionSearchGate records explicit failure posture when paper-backed cases cannot be satisfied', async () => {
    const fixture = {
      subject_code: '9709',
      curriculum_version_tag: DEFAULT_CURRICULUM_VERSION_TAG,
      thresholds: DEFAULT_QUESTION_SEARCH_GATE_THRESHOLDS,
      cases: [
        {
          id: 'imported-fallback-browser-continuity',
          description: 'Imported continuity fixture remains retrievable.',
          query: {
            topic_path: '9709.codex_cli.browser_fixture.continuity',
            primary_question_type_id: '9709.trigonometry.identities',
            q_number: 2,
            query: 'tan^2',
          },
          expected: {
            match: {
              question_id: 'question-imported-2',
              source_kind: 'imported_question',
              subject_code: '9709',
              primary_topic_path: '9709.codex_cli.browser_fixture.continuity',
              primary_question_type_id: '9709.trigonometry.identities',
              family_id: '9709.trigonometry_manipulation_equations',
              q_number: 2,
            },
            required_metadata: [
              'question_id',
              'source_kind',
              'subject_code',
              'primary_topic_path',
              'primary_question_type_id',
              'family_id',
              'q_number',
              'search_text',
            ],
            summary_policy: 'allow_null',
          },
        },
        {
          id: 'paper-pin-s16-p3-q7',
          description: 'Paper-backed integration case must have topic, paper, year, and summary coverage.',
          query: {
            topic_path: '9709.p3.integration',
            year: 2016,
            session: 's',
            paper_number: 3,
            q_number: 7,
            query: 'Evaluate integral I using substitution',
          },
          expected: {
            match: {
              source_kind: 'paper_question',
              subject_code: '9709',
              primary_topic_path: '9709.p3.integration',
              year: 2016,
              session: 's',
              paper_number: 3,
              q_number: 7,
            },
            required_metadata: [
              'source_kind',
              'subject_code',
              'primary_topic_path',
              'year',
              'session',
              'paper_number',
              'q_number',
              'summary',
            ],
            summary_policy: 'require_non_null',
          },
        },
      ],
    };

    const searchQuestionsFn = jest.fn().mockResolvedValue({
      items: [
        {
          question_id: 'question-imported-2',
          source_kind: 'imported_question',
          subject_code: '9709',
          primary_topic_path: '9709.codex_cli.browser_fixture.continuity',
          primary_question_type_id: '9709.trigonometry.identities',
          family_id: '9709.trigonometry_manipulation_equations',
          q_number: 2,
          summary: null,
          search_text: 'Prove that 1 - tan^2(x) = cos(2x) / cos^2(x).',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    });

    const resolveTopicPathFn = jest.fn(({ topicPath }) => {
      if (topicPath === '9709.codex_cli.browser_fixture.continuity') {
        return Promise.resolve('topic-browser-continuity');
      }
      return Promise.resolve(null);
    });

    const inspectDescriptorSourceFn = jest.fn().mockResolvedValue({
      selected_branch: 'question_descriptions_v0_status_ok',
      surfaces: {
        question_descriptions_prod_v1: { exists: false, count: null, count_9709: null },
        question_descriptions_v1: { exists: false, count: null, count_9709: null },
        question_descriptions_v0: { exists: true, count: 0, count_9709: 0 },
        learning_question_search_projection: { count: 11, count_9709: 11 },
        question_bank_9709: { total: 11, paper_question: 0, imported_question: 11 },
      },
    });

    const result = await runQuestionSearchGate({
      fixture,
      fixturePath: 'data/eval/question_search_gold_9709_v1.json',
      gateCommand: 'node scripts/evaluation/run_question_search_gate.js --fixture data/eval/question_search_gold_9709_v1.json --report docs/reports/2026-04-15-question-search-slice-v1-report.md',
      searchQuestionsFn,
      resolveTopicPathFn,
      inspectDescriptorSourceFn,
      nowIso: '2026-04-15T08:45:00Z',
    });

    expect(searchQuestionsFn).toHaveBeenCalledTimes(1);
    expect(result.metrics).toEqual({
      exact_structured_match_rate: 0.5,
      subject_leakage_rate: 0,
      metadata_completeness_rate: 0.5,
      null_summary_rate: 1,
    });
    expect(result.gate.pass).toBe(false);
    expect(result.gate.failing_checks.map((check) => check.metric)).toEqual([
      'exact_structured_match_rate',
      'metadata_completeness_rate',
      'null_summary_rate',
    ]);
    expect(result.case_results[1]).toMatchObject({
      id: 'paper-pin-s16-p3-q7',
      resolution_error: 'topic_path_not_found',
      exact_structured_match: false,
      summary_required: true,
      summary_present: false,
    });
    expect(result.report_markdown).toContain('## Runner Output');
    expect(result.report_markdown).toContain('question_descriptions_v0');
    expect(result.report_markdown).toContain('question_descriptions_v1');
    expect(result.report_markdown).toContain('Prefer `public.question_descriptions_prod_v1`');
    expect(result.report_markdown).toContain('paper_question: 0');
    expect(result.report_markdown).toContain('paper-backed pinned cases cannot pass');
  });

  test('runQuestionSearchGate marks alignment_blocked when a pinned paper case is blocked_for_review', async () => {
    const fixture = {
      subject_code: '9709',
      curriculum_version_tag: DEFAULT_CURRICULUM_VERSION_TAG,
      thresholds: DEFAULT_QUESTION_SEARCH_GATE_THRESHOLDS,
      cases: [
        {
          id: 'paper-pin-contested',
          description: 'Contested paper-backed rows must surface alignment preflight details.',
          query: {
            topic_path: '9709.p1.trigonometry',
            year: 2019,
            session: 's',
            paper_number: 1,
            q_number: 6,
            query: 'identity solve equation',
          },
          expected: {
            match: {
              source_kind: 'paper_question',
              subject_code: '9709',
              primary_topic_path: '9709.p1.trigonometry',
              year: 2019,
              session: 's',
              paper_number: 1,
              q_number: 6,
            },
            required_metadata: [
              'source_kind',
              'subject_code',
              'primary_topic_path',
              'year',
              'session',
              'paper_number',
              'q_number',
              'summary',
            ],
            summary_policy: 'require_non_null',
          },
          source_reference: {
            kind: 'manual_audit_review_sheet',
            storage_key: '9709/s19_qp_11/questions/q06.png',
          },
        },
      ],
    };

    const searchQuestionsFn = jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    });
    const resolveTopicPathFn = jest.fn().mockResolvedValue('topic-paper-trigonometry');
    const inspectDescriptorSourceFn = jest.fn().mockResolvedValue({
      selected_branch: 'question_descriptions_v0_status_ok',
      surfaces: {
        question_descriptions_prod_v1: { exists: false, count: null, count_9709: null },
        question_descriptions_v1: { exists: false, count: null, count_9709: null },
        question_descriptions_v0: { exists: true, count: 0, count_9709: 0 },
        learning_question_search_projection: { count: 11, count_9709: 11 },
        question_bank_9709: { total: 11, paper_question: 0, imported_question: 11 },
      },
    });
    const resolveAlignmentPostureFn = jest.fn().mockResolvedValue({
      authority_alignment_run_id: 'alignment-run-1',
      source_manifest_digest: 'digest-1',
      authority_truth_status: 'frozen',
      taxonomy_resolution_status: 'resolved',
      alignment_status: 'contested',
      alignment_review_required: true,
      manual_action_required: true,
      provisional_alignment_verdict: 'ready',
      overall_alignment_verdict: 'blocked_for_review',
    });

    const result = await runQuestionSearchGate({
      fixture,
      searchQuestionsFn,
      resolveTopicPathFn,
      inspectDescriptorSourceFn,
      resolveAlignmentPostureFn,
      nowIso: '2026-04-22T14:00:00Z',
    });

    expect(resolveAlignmentPostureFn).toHaveBeenCalledWith({
      storageKey: '9709/s19_qp_11/questions/q06.png',
      authorityAlignmentRunId: null,
      sourceManifestDigest: null,
    });
    expect(result.case_results[0]).toEqual(expect.objectContaining({
      id: 'paper-pin-contested',
      alignment_blocked: true,
      alignment_error: 'alignment_blocked_for_review',
      authority_alignment_run_id: 'alignment-run-1',
      source_manifest_digest: 'digest-1',
      authority_truth_status: 'frozen',
      taxonomy_resolution_status: 'resolved',
      alignment_status: 'contested',
      alignment_review_required: true,
      manual_action_required: true,
      provisional_alignment_verdict: 'ready',
      overall_alignment_verdict: 'blocked_for_review',
    }));
  });

  test('runQuestionSearchGate reports blocked_taxonomy_invalid separately from retrieval metrics', async () => {
    const fixture = {
      subject_code: '9709',
      curriculum_version_tag: DEFAULT_CURRICULUM_VERSION_TAG,
      thresholds: DEFAULT_QUESTION_SEARCH_GATE_THRESHOLDS,
      cases: [
        {
          id: 'imported-fallback-browser-repair',
          description: 'Imported fallback rows stay retrievable.',
          query: {
            topic_path: '9709.codex_cli.browser_fixture.repair',
            primary_question_type_id: '9709.trigonometry.equations',
            q_number: 1,
            query: '2cos(2x)-3sin x',
          },
          expected: {
            match: {
              question_id: 'question-imported-1',
              source_kind: 'imported_question',
              subject_code: '9709',
              primary_topic_path: '9709.codex_cli.browser_fixture.repair',
              primary_question_type_id: '9709.trigonometry.equations',
              family_id: '9709.trigonometry_manipulation_equations',
              q_number: 1,
            },
            required_metadata: [
              'question_id',
              'source_kind',
              'subject_code',
              'primary_topic_path',
              'primary_question_type_id',
              'family_id',
              'q_number',
              'search_text',
            ],
            summary_policy: 'allow_null',
          },
          source_reference: {
            kind: 'question_bank_fixture',
            storage_key: 'fixture/browser-closed-loop/repair-source',
          },
        },
        {
          id: 'paper-pin-taxonomy-invalid',
          description: 'Taxonomy-invalid paper rows must surface preflight posture without replacing retrieval metrics.',
          query: {
            topic_path: '9709.p3.integration',
            year: 2016,
            session: 's',
            paper_number: 3,
            q_number: 7,
            query: 'Evaluate integral I using substitution',
          },
          expected: {
            match: {
              source_kind: 'paper_question',
              subject_code: '9709',
              primary_topic_path: '9709.p3.integration',
              year: 2016,
              session: 's',
              paper_number: 3,
              q_number: 7,
            },
            required_metadata: [
              'source_kind',
              'subject_code',
              'primary_topic_path',
              'year',
              'session',
              'paper_number',
              'q_number',
              'summary',
            ],
            summary_policy: 'require_non_null',
          },
          source_reference: {
            kind: 'manual_audit_review_sheet',
            storage_key: '9709/s16_qp_33/questions/q07.png',
          },
        },
      ],
    };

    const searchQuestionsFn = jest.fn()
      .mockResolvedValueOnce({
        items: [
          {
            question_id: 'question-imported-1',
            source_kind: 'imported_question',
            subject_code: '9709',
            primary_topic_path: '9709.codex_cli.browser_fixture.repair',
            primary_question_type_id: '9709.trigonometry.equations',
            family_id: '9709.trigonometry_manipulation_equations',
            q_number: 1,
            summary: null,
            search_text: 'Solve 2cos(2x)-3sin x=0 for 0<=x<=180 degrees.',
          },
        ],
        total: 1,
        page: 1,
        page_size: 20,
      })
      .mockResolvedValueOnce({
        items: [],
        total: 0,
        page: 1,
        page_size: 20,
      });
    const resolveTopicPathFn = jest.fn(({ topicPath }) => {
      if (topicPath === '9709.codex_cli.browser_fixture.repair') {
        return Promise.resolve('topic-browser-repair');
      }
      if (topicPath === '9709.p3.integration') {
        return Promise.resolve('topic-paper-integration');
      }
      return Promise.resolve(null);
    });
    const inspectDescriptorSourceFn = jest.fn().mockResolvedValue({
      selected_branch: 'question_descriptions_v0_status_ok',
      surfaces: {
        question_descriptions_prod_v1: { exists: false, count: null, count_9709: null },
        question_descriptions_v1: { exists: false, count: null, count_9709: null },
        question_descriptions_v0: { exists: true, count: 0, count_9709: 0 },
        learning_question_search_projection: { count: 11, count_9709: 11 },
        question_bank_9709: { total: 11, paper_question: 0, imported_question: 11 },
      },
    });
    const resolveAlignmentPostureFn = jest.fn(async ({ storageKey }) => (
      storageKey === '9709/s16_qp_33/questions/q07.png'
        ? {
          authority_alignment_run_id: 'alignment-run-2',
          source_manifest_digest: 'digest-2',
          authority_truth_status: 'frozen',
          taxonomy_resolution_status: 'blocked',
          alignment_status: 'not_compared',
          alignment_review_required: false,
          manual_action_required: true,
          provisional_alignment_verdict: 'blocked_taxonomy_invalid',
          overall_alignment_verdict: 'blocked_taxonomy_invalid',
        }
        : null
    ));

    const result = await runQuestionSearchGate({
      fixture,
      searchQuestionsFn,
      resolveTopicPathFn,
      inspectDescriptorSourceFn,
      resolveAlignmentPostureFn,
      nowIso: '2026-04-22T14:10:00Z',
    });

    expect(result.metrics).toEqual({
      exact_structured_match_rate: 0.5,
      subject_leakage_rate: 0,
      metadata_completeness_rate: 0.5,
      null_summary_rate: 1,
    });
    expect(result.case_results[1]).toEqual(expect.objectContaining({
      id: 'paper-pin-taxonomy-invalid',
      alignment_blocked: true,
      alignment_error: 'alignment_blocked_taxonomy_invalid',
      authority_alignment_run_id: 'alignment-run-2',
      source_manifest_digest: 'digest-2',
      authority_truth_status: 'frozen',
      taxonomy_resolution_status: 'blocked',
      alignment_status: 'not_compared',
      alignment_review_required: false,
      manual_action_required: true,
      provisional_alignment_verdict: 'blocked_taxonomy_invalid',
      overall_alignment_verdict: 'blocked_taxonomy_invalid',
      total_results: 0,
      top_result_question_id: null,
      exact_structured_match: false,
    }));
  });

  test('runQuestionSearchGate keeps mixed-source authority fixtures green when paper-backed rows rank first', async () => {
    const fixture = {
      subject_code: '9709',
      curriculum_version_tag: DEFAULT_CURRICULUM_VERSION_TAG,
      thresholds: DEFAULT_QUESTION_SEARCH_GATE_THRESHOLDS,
      cases: [
        {
          id: 'mixed-ranking-paper-authority',
          description: 'Paper-backed rows outrank imported rows when both satisfy the same structured query.',
          query: {
            topic_path: '9709.p1.trigonometry',
            primary_question_type_id: '9709.trigonometry.equations',
            query: 'identity solve equation',
          },
          expected: {
            match: {
              question_id: 'question-paper-1',
              source_kind: 'paper_question',
              subject_code: '9709',
              primary_topic_path: '9709.p1.trigonometry',
              primary_question_type_id: '9709.trigonometry.equations',
              q_number: 6,
            },
            required_metadata: [
              'question_id',
              'source_kind',
              'subject_code',
              'primary_topic_path',
              'primary_question_type_id',
              'q_number',
              'summary',
            ],
            summary_policy: 'require_non_null',
          },
        },
      ],
    };

    const searchQuestionsFn = jest.fn().mockResolvedValue({
      items: [
        {
          question_id: 'question-paper-1',
          source_kind: 'paper_question',
          subject_code: '9709',
          primary_topic_path: '9709.p1.trigonometry',
          primary_question_type_id: '9709.trigonometry.equations',
          q_number: 6,
          summary: 'Prove a trigonometric identity and solve the resulting equation.',
        },
        {
          question_id: 'question-imported-1',
          source_kind: 'imported_question',
          subject_code: '9709',
          primary_topic_path: '9709.p1.trigonometry',
          primary_question_type_id: '9709.trigonometry.equations',
          q_number: 91,
          summary: null,
        },
      ],
      total: 2,
      page: 1,
      page_size: 20,
    });

    const resolveTopicPathFn = jest.fn().mockResolvedValue('topic-paper-trigonometry');
    const inspectDescriptorSourceFn = jest.fn().mockResolvedValue({
      selected_branch: 'question_descriptions_v0_status_ok',
      surfaces: {
        question_descriptions_prod_v1: { exists: false, count: null, count_9709: null },
        question_descriptions_v1: { exists: false, count: null, count_9709: null },
        question_descriptions_v0: { exists: true, count: 24, count_9709: 24 },
        learning_question_search_projection: { count: 24, count_9709: 24 },
        question_bank_9709: { total: 24, paper_question: 22, imported_question: 2 },
      },
    });

    const result = await runQuestionSearchGate({
      fixture,
      searchQuestionsFn,
      resolveTopicPathFn,
      inspectDescriptorSourceFn,
      nowIso: '2026-04-16T09:00:00Z',
    });

    expect(result.metrics).toEqual({
      exact_structured_match_rate: 1,
      subject_leakage_rate: 0,
      metadata_completeness_rate: 1,
      null_summary_rate: 0,
    });
    expect(result.gate.pass).toBe(true);
    expect(result.case_results[0]).toEqual(expect.objectContaining({
      id: 'mixed-ranking-paper-authority',
      top_result_question_id: 'question-paper-1',
      total_results: 2,
    }));
  });

  test('curriculum node resolution SQL filters by syllabus, topic_path, and explicit version_tag', () => {
    const sql = buildCurriculumNodeResolutionSql({
      subjectCode: '9709',
      topicPath: '9709.p1.trigonometry',
      curriculumVersionTag: '2025-2027_v1',
    });

    expect(sql).toContain("FROM public.curriculum_nodes");
    expect(sql).toContain("syllabus_code = '9709'");
    expect(sql).toContain("topic_path::text = '9709.p1.trigonometry'");
    expect(sql).toContain("version_tag = '2025-2027_v1'");
    expect(sql).toContain('ORDER BY node_id ASC');
    expect(sql).toContain('LIMIT 1');
  });

  test('parse/build gate command preserves docker psql execution flags', () => {
    const args = parseQuestionSearchGateArgs([
      '--fixture',
      'data/eval/question_search_gold_9709_v1.json',
      '--report',
      'docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun-report.md',
      '--json-out',
      'docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun.json',
      '--psql-mode',
      'docker',
      '--psql-container',
      'supabase_db_ciecopilot-home',
    ]);

    expect(args).toMatchObject({
      fixture: 'data/eval/question_search_gold_9709_v1.json',
      report: 'docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun-report.md',
      jsonOut: 'docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun.json',
      psqlMode: 'docker',
      psqlContainer: 'supabase_db_ciecopilot-home',
    });
    expect(buildGateCommand(args)).toContain('--psql-mode docker');
    expect(buildGateCommand(args)).toContain('--psql-container supabase_db_ciecopilot-home');
    expect(
      resolveQuestionSearchGatePsqlConfig(args, {
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      }),
    ).toEqual({
      mode: 'docker',
      databaseUrl: null,
      containerName: 'supabase_db_ciecopilot-home',
    });
  });

  test('selectSupabaseDbContainerName returns the sole matching container and fails loudly when missing or ambiguous', () => {
    expect(selectSupabaseDbContainerName([
      'redis_cache_ciecopilot-home',
      'supabase_db_ciecopilot-home',
      'supabase_imgproxy_ciecopilot-home',
    ])).toBe('supabase_db_ciecopilot-home');

    expect(() => selectSupabaseDbContainerName([
      'redis_cache_ciecopilot-home',
      'studio_ciecopilot-home',
    ])).toThrow('Supabase DB container not found');

    expect(() => selectSupabaseDbContainerName([
      'supabase_db_alpha',
      'supabase_db_beta',
    ])).toThrow('Multiple Supabase DB containers found');
  });

  test('getProjectionSearchMode falls back to psql for DATABASE_URL-only environments', () => {
    expect(getProjectionSearchMode({
      DATABASE_URL: 'postgres://example.test/db',
    })).toBe('psql');
  });

  test('getProjectionSearchMode falls back to psql when SUPABASE_PG_COMPAT is enabled', () => {
    expect(getProjectionSearchMode({
      DATABASE_URL: 'postgres://example.test/db',
      SUPABASE_URL: 'https://supabase.example.test',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      SUPABASE_PG_COMPAT: 'true',
    })).toBe('psql');
  });

  test('searchProjectionFromDatabase uses SQL fallback when service env is unavailable', async () => {
    const runPsqlJsonFn = jest.fn().mockResolvedValue({
      total: 1,
      items: [{ question_id: 'question-paper-1' }],
    });
    const searchQuestionsFn = jest.fn();
    const getServiceClientFn = jest.fn();

    const result = await searchProjectionFromDatabase({
      subject_code: '9709',
      primary_topic_id: 'topic-paper-trigonometry',
      query: 'identity solve equation',
    }, {
      env: {
        DATABASE_URL: 'postgres://example.test/db',
      },
      runPsqlJsonFn,
      searchQuestionsFn,
      getServiceClientFn,
    });

    expect(result).toEqual({
      total: 1,
      items: [
        expect.objectContaining({
          question_id: 'question-paper-1',
        }),
      ],
    });
    expect(searchQuestionsFn).not.toHaveBeenCalled();
    expect(getServiceClientFn).not.toHaveBeenCalled();
    expect(runPsqlJsonFn).toHaveBeenCalledTimes(1);
    expect(runPsqlJsonFn.mock.calls[0][0]).toContain('FROM public.learning_question_search_projection');
    expect(runPsqlJsonFn.mock.calls[0][0]).toContain("subject_code = '9709'");
    expect(runPsqlJsonFn.mock.calls[0][0]).toContain("primary_topic_id = 'topic-paper-trigonometry'");
    expect(runPsqlJsonFn.mock.calls[0][0]).toContain("search_text ILIKE '%' || 'identity' || '%' ESCAPE '\\'");
    expect(runPsqlJsonFn.mock.calls[0][0]).toContain("search_text ILIKE '%' || 'solve' || '%' ESCAPE '\\'");
    expect(runPsqlJsonFn.mock.calls[0][0]).toContain("search_text ILIKE '%' || 'equation' || '%' ESCAPE '\\'");
  });

  test('searchProjectionFromDatabase uses SQL fallback when pg-compat is enabled', async () => {
    const runPsqlJsonFn = jest.fn().mockResolvedValue({
      total: 2,
      items: [{ question_id: 'question-paper-1' }, { question_id: 'question-imported-1' }],
    });
    const searchQuestionsFn = jest.fn();
    const getServiceClientFn = jest.fn();

    const result = await searchProjectionFromDatabase({
      subject_code: '9709',
      query: 'tan^2',
    }, {
      env: {
        DATABASE_URL: 'postgres://example.test/db',
        SUPABASE_URL: 'https://supabase.example.test',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        SUPABASE_PG_COMPAT: 'true',
      },
      runPsqlJsonFn,
      searchQuestionsFn,
      getServiceClientFn,
    });

    expect(result.total).toBe(2);
    expect(runPsqlJsonFn).toHaveBeenCalledTimes(1);
    expect(searchQuestionsFn).not.toHaveBeenCalled();
    expect(getServiceClientFn).not.toHaveBeenCalled();
  });

  test('searchProjectionFromDatabase ranks psql fallback rows with the product ordering contract', async () => {
    const runPsqlJsonFn = jest.fn().mockResolvedValue({
      total: 3,
      items: [
        {
          question_id: 'question-paper-s21-q7',
          source_kind: 'paper_question',
          subject_code: '9709',
          release_scope_status: 'released_scoring',
          primary_topic_id: 'topic-paper-trigonometry',
          primary_topic_path: '9709.p1.trigonometry',
          primary_question_type_id: '9709.trigonometry.identities',
          family_id: '9709.trigonometry_manipulation_equations',
          storage_key: '9709/s21_qp_11/questions/q07.png',
          q_number: 7,
          year: 2021,
          session: 's',
          paper_number: 1,
          variant: 1,
          summary: 'Prove the identity ... Hence solve the equation ...',
          search_text: 'trigonometric identity prove identity solve equation',
          primary_topic_title: 'Trigonometry',
        },
        {
          question_id: 'question-paper-s19-q6',
          source_kind: 'paper_question',
          subject_code: '9709',
          release_scope_status: 'released_scoring',
          primary_topic_id: 'topic-paper-trigonometry',
          primary_topic_path: '9709.p1.trigonometry',
          primary_question_type_id: '9709.trigonometry.identities',
          family_id: '9709.trigonometry_manipulation_equations',
          storage_key: '9709/s19_qp_11/questions/q06.png',
          q_number: 6,
          year: 2019,
          session: 's',
          paper_number: 1,
          variant: 1,
          summary: 'Prove the identity ... Hence solve the equation ...',
          search_text: 'trigonometric identity prove identity solve equation',
          primary_topic_title: 'Trigonometry',
        },
        {
          question_id: 'question-paper-w19-q5',
          source_kind: 'paper_question',
          subject_code: '9709',
          release_scope_status: 'released_scoring',
          primary_topic_id: 'topic-paper-trigonometry',
          primary_topic_path: '9709.p1.trigonometry',
          primary_question_type_id: '9709.trigonometry.equations',
          family_id: '9709.trigonometry_manipulation_equations',
          storage_key: '9709/w19_qp_11/questions/q05.png',
          q_number: 5,
          year: 2019,
          session: 'w',
          paper_number: 1,
          variant: 1,
          summary: 'Given that ... Hence solve the equation ...',
          search_text: 'trigonometric equation prove identity solve equation',
          primary_topic_title: 'Trigonometry',
        },
      ],
    });

    const result = await searchProjectionFromDatabase({
      subject_code: '9709',
      primary_topic_id: 'topic-paper-trigonometry',
      query: 'identity solve equation',
      page: 1,
      page_size: 2,
    }, {
      env: {
        DATABASE_URL: 'postgres://example.test/db',
      },
      runPsqlJsonFn,
    });

    expect(result.total).toBe(3);
    expect(result.items.map((item) => item.question_id)).toEqual([
      'question-paper-s19-q6',
      'question-paper-s21-q7',
    ]);
  });

  test('searchProjectionFromDatabase honors explicit psqlConfig even when service env is available', async () => {
    const runPsqlJsonFn = jest.fn().mockResolvedValue({
      total: 1,
      items: [{ question_id: 'question-paper-1' }],
    });
    const searchQuestionsFn = jest.fn();
    const getServiceClientFn = jest.fn();

    const result = await searchProjectionFromDatabase({
      subject_code: '9709',
      query: 'prove identity',
    }, {
      env: {
        DATABASE_URL: 'postgres://example.test/db',
        SUPABASE_URL: 'https://supabase.example.test',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      },
      psqlConfig: {
        mode: 'docker',
        databaseUrl: null,
        containerName: 'supabase_db_ciecopilot-home',
      },
      runPsqlJsonFn,
      searchQuestionsFn,
      getServiceClientFn,
    });

    expect(result.total).toBe(1);
    expect(runPsqlJsonFn).toHaveBeenCalledTimes(1);
    expect(runPsqlJsonFn.mock.calls[0][0]).toContain('FROM public.learning_question_search_projection');
    expect(runPsqlJsonFn.mock.calls[0][1]).toEqual({
      mode: 'docker',
      databaseUrl: null,
      containerName: 'supabase_db_ciecopilot-home',
    });
    expect(searchQuestionsFn).not.toHaveBeenCalled();
    expect(getServiceClientFn).not.toHaveBeenCalled();
  });
});
