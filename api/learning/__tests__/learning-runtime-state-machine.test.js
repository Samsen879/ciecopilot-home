import {
  buildLearningRuntimeBlockedState,
  buildLearningRuntimeReviewTaskState,
} from '../lib/orchestration/learning-runtime-state-machine.js';

function buildTask(overrides = {}) {
  return {
    review_task_id: 'review-task-1',
    status: 'open',
    trigger_type: 'short_delay',
    due_at: '2026-03-26T08:00:00.000Z',
    success_criteria: {
      scheduler_policy: {
        route: 'short_delay',
        freshness_bucket: 'cooling',
      },
    },
    ...overrides,
  };
}

describe('learning runtime state machine', () => {
  test('immediate repair due now escalates into the repair-critical state', () => {
    expect(buildLearningRuntimeReviewTaskState(
      buildTask({
        trigger_type: 'immediate_repair',
        due_at: '2026-03-25T10:00:00.000Z',
        success_criteria: {
          scheduler_policy: {
            route: 'immediate_repair',
            freshness_bucket: 'fresh',
          },
        },
      }),
      { now: '2026-03-25T10:00:00.000Z' },
    )).toEqual({
      value: 'escalated',
      label: 'Escalated',
      tone: 'danger',
      reason_code: 'fresh_immediate_repair',
      reason_summary: 'Fresh repair evidence should be retried before it is spaced.',
    });
  });

  test('overdue spaced work becomes due instead of escalating', () => {
    expect(buildLearningRuntimeReviewTaskState(
      buildTask({
        due_at: '2026-03-25T09:00:00.000Z',
      }),
      { now: '2026-03-25T10:00:00.000Z' },
    )).toEqual({
      value: 'due',
      label: 'Due',
      tone: 'warning',
      reason_code: 'due_window_open',
      reason_summary: 'Due because the current review window has opened.',
    });
  });

  test('future review work stays deferred until its window opens', () => {
    expect(buildLearningRuntimeReviewTaskState(
      buildTask({
        due_at: '2026-03-25T12:00:00.000Z',
      }),
      { now: '2026-03-25T10:00:00.000Z' },
    )).toEqual({
      value: 'deferred',
      label: 'Deferred',
      tone: 'neutral',
      reason_code: 'freshness_window',
      reason_summary: 'Deferred until the next spaced-review freshness window opens.',
    });
  });

  test('completed lifecycle status stays completed for projection reads', () => {
    expect(buildLearningRuntimeReviewTaskState(
      buildTask({
        status: 'completed',
        due_at: null,
      }),
      { now: '2026-03-25T10:00:00.000Z' },
    )).toEqual({
      value: 'completed',
      label: 'Completed',
      tone: 'success',
      reason_code: null,
      reason_summary: null,
    });
  });

  test('projection overload reasons can block an otherwise active task', () => {
    expect(buildLearningRuntimeBlockedState('daily_recommendation_cap')).toEqual({
      value: 'blocked',
      label: 'Blocked',
      tone: 'danger',
      reason_code: 'daily_recommendation_cap',
      reason_summary:
        'Blocked by overload control because the canonical queue already has 3 higher-priority tasks.',
    });
  });
});
