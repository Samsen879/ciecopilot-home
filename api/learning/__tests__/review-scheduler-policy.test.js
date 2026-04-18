import {
  buildReviewTaskSchedulerSeed,
  deriveReviewQueueProjection,
  REVIEW_SCHEDULER_POLICY,
} from '../lib/review/review-scheduler-policy.js';

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

  test('buildReviewTaskSchedulerSeed includes a bounded factor profile for the real scheduler path', () => {
    const scheduler = buildReviewTaskSchedulerSeed({
      regressionRecovery: true,
      learnerGoal: 'exam_polish',
      classificationConfidence: 0.79,
      now: new Date('2026-03-25T10:00:00.000Z'),
    });

    expect(scheduler.policy).toEqual(expect.objectContaining({
      factor_profile: {
        total_score: 9,
        freshness: {
          bucket: 'stale',
          score: 1,
        },
        overdue_pressure: {
          score: 0,
        },
        band_vulnerability: {
          band: 'low',
          score: 2,
        },
        trigger_urgency: {
          route: 'regression_recovery',
          score: 3,
        },
        exam_proximity: {
          score: 1,
        },
        regression_severity: {
          score: 2,
        },
      },
    }));
  });

  test('deriveReviewQueueProjection prefers higher bounded factor totals over stronger compatibility routes', () => {
    const projection = deriveReviewQueueProjection([
      buildTask({
        review_task_id: 'review-task-regression-route',
        target_question_type_id: '9709.trigonometry.identities',
        trigger_type: 'regression_recovery',
        priority: 'urgent',
        due_at: '2026-03-26T08:00:00.000Z',
        success_criteria: {
          scheduler_policy: {
            route: 'regression_recovery',
            freshness_bucket: 'stale',
            factor_profile: {
              total_score: 6,
              freshness: { score: 0 },
              overdue_pressure: { score: 0 },
              band_vulnerability: { score: 1 },
              trigger_urgency: { score: 2 },
              exam_proximity: { score: 0 },
              regression_severity: { score: 3 },
            },
          },
        },
      }),
      buildTask({
        review_task_id: 'review-task-immediate-route',
        target_question_type_id: '9709.trigonometry.functions',
        trigger_type: 'immediate_repair',
        priority: 'high',
        due_at: '2026-03-25T10:00:00.000Z',
        success_criteria: {
          scheduler_policy: {
            route: 'immediate_repair',
            freshness_bucket: 'fresh',
            factor_profile: {
              total_score: 7,
              freshness: { score: 2 },
              overdue_pressure: { score: 1 },
              band_vulnerability: { score: 1 },
              trigger_urgency: { score: 3 },
              exam_proximity: { score: 0 },
              regression_severity: { score: 0 },
            },
          },
        },
      }),
      buildTask({
        review_task_id: 'review-task-factor-winner',
        target_question_type_id: '9709.trigonometry.series',
        trigger_type: 'short_delay',
        priority: 'normal',
        due_at: '2026-03-25T09:00:00.000Z',
        success_criteria: {
          scheduler_policy: {
            route: 'short_delay',
            freshness_bucket: 'cooling',
            factor_profile: {
              total_score: 11,
              freshness: { score: 1 },
              overdue_pressure: { score: 3 },
              band_vulnerability: { score: 3 },
              trigger_urgency: { score: 1 },
              exam_proximity: { score: 1 },
              regression_severity: { score: 2 },
            },
          },
        },
      }),
      buildTask({
        review_task_id: 'review-task-route-only-loser',
        target_question_type_id: '9709.trigonometry.revision',
        trigger_type: 'exam_polish',
        priority: 'high',
        due_at: '2026-03-26T07:00:00.000Z',
        success_criteria: {
          scheduler_policy: {
            route: 'exam_polish',
            freshness_bucket: 'cooling',
            factor_profile: {
              total_score: 5,
              freshness: { score: 1 },
              overdue_pressure: { score: 0 },
              band_vulnerability: { score: 1 },
              trigger_urgency: { score: 1 },
              exam_proximity: { score: 2 },
              regression_severity: { score: 0 },
            },
          },
        },
      }),
    ], {
      now: '2026-03-25T10:00:00.000Z',
    });

    expect(projection.items.find((item) => item.review_task_id === 'review-task-factor-winner'))
      .toEqual(expect.objectContaining({
        scheduler_state: expect.objectContaining({
          value: 'due',
        }),
      }));
    expect(projection.items.find((item) => item.review_task_id === 'review-task-route-only-loser'))
      .toEqual(expect.objectContaining({
        scheduler_state: expect.objectContaining({
          value: 'blocked',
          reason_code: 'daily_recommendation_cap',
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
});
