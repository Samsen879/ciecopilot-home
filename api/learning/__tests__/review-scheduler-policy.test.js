import {
  buildReviewTaskSchedulerSeed,
  deriveReviewQueueProjection,
  REVIEW_SCHEDULER_POLICY,
} from '../lib/review/review-scheduler-policy.js';

const FROZEN_STUDENT_LABELS = new Set([
  '最近出错',
  '间隔已到',
  '临近考试',
  '同题型回补',
  '回归风险',
]);

function buildTask(overrides = {}) {
  return {
    review_task_id: 'review-task-1',
    user_id: 'student-1',
    target_kind: 'question_type',
    target_topic_id: 'topic-1',
    target_topic_path: '9709/trigonometry/equations',
    target_family_id: '9709.trigonometry_manipulation_equations',
    target_question_type_id: '9709.trigonometry.equations',
    target_misconception_tags: [],
    related_artifact_refs: [],
    trigger_type: 'short_delay',
    mode: 'redo_variant',
    due_at: '2026-03-26T08:00:00.000Z',
    priority: 'normal',
    estimated_minutes: 15,
    success_criteria: {
      scheduler_policy: {
        route: 'short_delay',
        freshness_bucket: 'cooling',
      },
    },
    completion_evidence: {},
    status: 'open',
    created_at: '2026-03-25T08:00:00.000Z',
    updated_at: '2026-03-25T08:00:00.000Z',
    ...overrides,
  };
}

describe('review scheduler policy', () => {
  test('buildReviewTaskSchedulerSeed gives fresh immediate-repair tasks explicit overload and freshness policy', () => {
    const scheduler = buildReviewTaskSchedulerSeed({
      misconceptionTags: ['domain:interval'],
      fallbackReasonCode: 'non_released_fallback',
      now: new Date('2026-03-25T10:00:00.000Z'),
    });

    expect(scheduler).toEqual(expect.objectContaining({
      triggerType: 'immediate_repair',
      mode: 'trap_fix',
      priority: 'high',
      dueAt: '2026-03-25T10:00:00.000Z',
      policy: expect.objectContaining({
        route: 'immediate_repair',
        freshness_bucket: 'fresh',
        daily_recommendation_cap: REVIEW_SCHEDULER_POLICY.DAILY_RECOMMENDATION_CAP,
        max_high_priority_open_per_type: REVIEW_SCHEDULER_POLICY.MAX_HIGH_PRIORITY_OPEN_PER_TYPE,
        immediate_repair_max_deferral_at: '2026-03-25T22:00:00.000Z',
        fallback_reason_code: 'non_released_fallback',
      }),
    }));
  });

  test('deriveReviewQueueProjection blocks overflowed tasks after the daily recommendation cap', () => {
    const projection = deriveReviewQueueProjection([
      buildTask({
        review_task_id: 'review-task-urgent',
        trigger_type: 'immediate_repair',
        priority: 'high',
        due_at: '2026-03-25T09:00:00.000Z',
        success_criteria: {
          scheduler_policy: {
            route: 'immediate_repair',
            freshness_bucket: 'fresh',
          },
        },
      }),
      buildTask({
        review_task_id: 'review-task-due',
        trigger_type: 'regression_recovery',
        target_question_type_id: '9709.trigonometry.identities',
        priority: 'urgent',
        due_at: '2026-03-25T09:30:00.000Z',
        success_criteria: {
          scheduler_policy: {
            route: 'regression_recovery',
            freshness_bucket: 'stale',
          },
        },
      }),
      buildTask({
        review_task_id: 'review-task-open-1',
        target_question_type_id: '9709.trigonometry.functions',
        due_at: '2026-03-25T09:45:00.000Z',
        success_criteria: {
          scheduler_policy: {
            route: 'short_delay',
            freshness_bucket: 'cooling',
          },
        },
      }),
      buildTask({
        review_task_id: 'review-task-open-2',
        target_question_type_id: '9709.trigonometry.mixed',
        target_topic_id: 'topic-2',
        due_at: '2026-03-26T08:00:00.000Z',
        success_criteria: {
          scheduler_policy: {
            route: 'spaced_review',
            freshness_bucket: 'current',
          },
        },
      }),
    ], {
      now: '2026-03-25T10:00:00.000Z',
    });

    expect(projection.summary).toEqual(expect.objectContaining({
      total: 4,
      escalated: 2,
      due: 1,
      blocked: 1,
    }));
    expect(projection.items.find((item) => item.review_task_id === 'review-task-open-2'))
      .toEqual(expect.objectContaining({
        scheduler_state: expect.objectContaining({
          value: 'blocked',
          reason_code: 'daily_recommendation_cap',
        }),
        scheduler_reasons: expect.arrayContaining([
          expect.objectContaining({
            code: 'daily_recommendation_cap',
          }),
        ]),
      }));
  });

  test('deriveReviewQueueProjection keeps only one active high-priority task per question type', () => {
    const projection = deriveReviewQueueProjection([
      buildTask({
        review_task_id: 'review-task-primary',
        trigger_type: 'immediate_repair',
        priority: 'high',
        due_at: '2026-03-25T09:00:00.000Z',
        success_criteria: {
          scheduler_policy: {
            route: 'immediate_repair',
            freshness_bucket: 'fresh',
          },
        },
      }),
      buildTask({
        review_task_id: 'review-task-shadowed',
        trigger_type: 'regression_recovery',
        priority: 'urgent',
        due_at: '2026-03-25T09:30:00.000Z',
        success_criteria: {
          scheduler_policy: {
            route: 'regression_recovery',
            freshness_bucket: 'stale',
          },
        },
      }),
    ], {
      now: '2026-03-25T10:00:00.000Z',
    });

    expect(projection.items.find((item) => item.review_task_id === 'review-task-primary'))
      .toEqual(expect.objectContaining({
        scheduler_state: expect.objectContaining({
          value: 'blocked',
          reason_code: 'high_priority_type_limit',
        }),
      }));
    expect(projection.items.find((item) => item.review_task_id === 'review-task-shadowed'))
      .toEqual(expect.objectContaining({
        scheduler_state: expect.objectContaining({
          value: 'escalated',
        }),
      }));
  });

  test('deriveReviewQueueProjection shapes compact student explanations from structured factors only', () => {
    const fixtures = [
      {
        name: 'recent error repair',
        now: '2026-03-25T10:00:00.000Z',
        task: buildTask({
          review_task_id: 'review-task-repair',
          trigger_type: 'immediate_repair',
          due_at: '2026-03-25T09:00:00.000Z',
          source_question_id: 'question-1',
          source_attempt_ref: {
            kind: 'attempt',
            attempt_id: 'attempt-1',
          },
          target_misconception_tags: ['domain:interval'],
          success_criteria: {
            scheduler_policy: {
              route: 'immediate_repair',
              freshness_bucket: 'fresh',
            },
          },
        }),
        expected: {
          summary: '你最近在这个题型上出错过，所以先安排一次同题型回补。',
          labels: ['最近出错', '同题型回补'],
          summaryFactorCodes: ['recent_error', 'same_question_type_repair'],
        },
      },
      {
        name: 'due exam polish',
        now: '2026-03-25T10:00:00.000Z',
        task: buildTask({
          review_task_id: 'review-task-exam',
          trigger_type: 'exam_polish',
          mode: 'timed_check',
          priority: 'high',
          due_at: '2026-03-25T09:30:00.000Z',
          success_criteria: {
            scheduler_policy: {
              route: 'exam_polish',
              freshness_bucket: 'cooling',
            },
          },
        }),
        expected: {
          summary: '临近考试，而且现在到了这类内容的复习时间，所以安排一次回顾。',
          labels: ['间隔已到', '临近考试'],
          summaryFactorCodes: ['exam_near', 'interval_due'],
        },
      },
      {
        name: 'regression recovery',
        now: '2026-03-25T10:00:00.000Z',
        task: buildTask({
          review_task_id: 'review-task-regression',
          trigger_type: 'regression_recovery',
          priority: 'urgent',
          due_at: '2026-03-25T09:45:00.000Z',
          source_question_id: 'question-2',
          source_attempt_ref: {
            kind: 'attempt',
            attempt_id: 'attempt-2',
          },
          success_criteria: {
            scheduler_policy: {
              route: 'regression_recovery',
              freshness_bucket: 'stale',
            },
          },
        }),
        expected: {
          summary: '这类内容有回归风险，而且你最近在这个题型上出错过，所以安排一次同题型回补。',
          labels: ['最近出错', '同题型回补', '回归风险'],
          summaryFactorCodes: [
            'regression_risk',
            'recent_error',
            'same_question_type_repair',
          ],
        },
      },
    ];

    fixtures.forEach(({ name, now, task, expected }) => {
      const item = deriveReviewQueueProjection([task], { now }).items[0];

      expect(item.student_explanation).toEqual(expect.objectContaining({
        summary: expected.summary,
        labels: expected.labels,
        provenance: expect.objectContaining({
          summary_factor_codes: expected.summaryFactorCodes,
          label_mappings: expected.labels.map((label) => expect.objectContaining({
            label,
          })),
        }),
      }));

      expect(item.student_explanation.labels).toHaveLength(expected.labels.length);
      expect(item.student_explanation.labels.every((label) => FROZEN_STUDENT_LABELS.has(label)))
        .toBe(true);

      const studentCopy = `${item.student_explanation.summary} ${item.student_explanation.labels.join(' ')}`;
      ['immediate_repair', 'spaced_review', 'regression_recovery', 'exam_polish', 'band']
        .forEach((token) => {
          expect(studentCopy).not.toContain(token);
        });

      expect(item.explanation?.factors?.length).toBeGreaterThanOrEqual(2);
      expect(item.student_explanation.provenance.label_mappings).toHaveLength(expected.labels.length);
      expect(item.student_explanation.provenance.summary_factor_codes.length).toBeGreaterThanOrEqual(2);
      expect(item.student_explanation.provenance.summary_factor_codes.length).toBeLessThanOrEqual(4);
      expect(name).toBeTruthy();
    });
  });

  test('deriveReviewQueueProjection omits compact student explanations when structured grounding is missing', () => {
    const item = deriveReviewQueueProjection([
      buildTask({
        review_task_id: 'review-task-ungrounded',
        target_question_type_id: null,
        due_at: '2026-03-26T08:00:00.000Z',
        source_question_id: null,
        source_attempt_ref: null,
        target_misconception_tags: [],
        success_criteria: {
          scheduler_policy: {
            route: 'short_delay',
            freshness_bucket: 'cooling',
          },
          explainability: {
            attempt_history: {
              attempt_count: 0,
              source_attempt_refs: [],
              source_question_ids: [],
            },
            evidence: {
              source_question_id: null,
              source_attempt_ref: null,
              misconception_tags: [],
            },
            freshness: {
              route: 'short_delay',
              bucket: 'cooling',
            },
          },
        },
      }),
    ], {
      now: '2026-03-25T10:00:00.000Z',
    }).items[0];

    expect(item.student_explanation).toBeNull();
  });
});
