import { jest } from '@jest/globals';
import React from 'react';
import ReviewTaskActionBar from '../ReviewTaskActionBar.js';

function findElement(node, predicate) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (predicate(node)) {
    return node;
  }

  const children = React.Children.toArray(node.props?.children);
  for (const child of children) {
    const match = findElement(child, predicate);
    if (match) {
      return match;
    }
  }

  return null;
}

function createItem(overrides = {}) {
  return {
    reviewTaskId: 'review-task-1',
    canComplete: true,
    canReschedule: true,
    launchPayload: {
      anchorKind: 'review_task',
      reviewTaskId: 'review-task-1',
      mode: 'spaced_review',
      topicId: 'topic-trig-equations',
      topicPath: '9709/trigonometry/equations',
      currentQuestionTypeId: '9709.trigonometry.equations',
    },
    workspaceLink: {
      topicId: 'topic-trig-equations',
      topicPath: '9709/trigonometry/equations',
    },
    ...overrides,
  };
}

describe('ReviewTaskActionBar', () => {
  test('routes launch and write intents through the supplied callbacks', () => {
    const onLaunch = jest.fn();
    const onComplete = jest.fn();
    const onReschedule = jest.fn();
    const onOpenWorkspace = jest.fn();
    const onDraftChange = jest.fn();

    const tree = ReviewTaskActionBar({
      item: createItem(),
      draft: {
        completionSummary: 'Solved a fresh repair variant.',
        dueAt: '2026-03-25T09:30',
      },
      onLaunch,
      onComplete,
      onReschedule,
      onOpenWorkspace,
      onDraftChange,
    });

    const summaryField = findElement(
      tree,
      (element) => element.type === 'textarea' && element.props.name === 'completionSummary',
    );
    summaryField.props.onChange({ target: { value: 'Need one more interval check.' } });

    const dueField = findElement(
      tree,
      (element) => element.type === 'input' && element.props.name === 'dueAt',
    );
    dueField.props.onChange({ target: { value: '2026-03-26T08:15' } });

    const launchButton = findElement(
      tree,
      (element) => element.type === 'button' && element.props['data-action'] === 'launch-review',
    );
    launchButton.props.onClick();

    const workspaceButton = findElement(
      tree,
      (element) => element.type === 'button' && element.props['data-action'] === 'open-workspace',
    );
    workspaceButton.props.onClick();

    const completeButton = findElement(
      tree,
      (element) => element.type === 'button' && element.props['data-action'] === 'complete-review',
    );
    completeButton.props.onClick();

    const partialButton = findElement(
      tree,
      (element) => element.type === 'button' && element.props['data-action'] === 'partial-review',
    );
    partialButton.props.onClick();

    const rescheduleButton = findElement(
      tree,
      (element) => element.type === 'button' && element.props['data-action'] === 'reschedule-review',
    );
    rescheduleButton.props.onClick();

    expect(onDraftChange).toHaveBeenNthCalledWith(1, 'review-task-1', {
      completionSummary: 'Need one more interval check.',
    });
    expect(onDraftChange).toHaveBeenNthCalledWith(2, 'review-task-1', {
      dueAt: '2026-03-26T08:15',
    });
    expect(onLaunch).toHaveBeenCalledWith({
      anchorKind: 'review_task',
      reviewTaskId: 'review-task-1',
      mode: 'spaced_review',
      topicId: 'topic-trig-equations',
      topicPath: '9709/trigonometry/equations',
      currentQuestionTypeId: '9709.trigonometry.equations',
    });
    expect(onOpenWorkspace).toHaveBeenCalledWith({
      topicId: 'topic-trig-equations',
      topicPath: '9709/trigonometry/equations',
    });
    expect(onComplete).toHaveBeenNthCalledWith(1, {
      reviewTaskId: 'review-task-1',
      completionOutcome: 'completed',
      completionSummary: 'Solved a fresh repair variant.',
    });
    expect(onComplete).toHaveBeenNthCalledWith(2, {
      reviewTaskId: 'review-task-1',
      completionOutcome: 'partial',
      completionSummary: 'Solved a fresh repair variant.',
    });
    expect(onReschedule).toHaveBeenCalledWith({
      reviewTaskId: 'review-task-1',
      dueAt: '2026-03-25T09:30',
    });
  });

  test('disables write controls when the task is not actionable', () => {
    const tree = ReviewTaskActionBar({
      item: createItem({
        canComplete: false,
        canReschedule: false,
      }),
      draft: {
        completionSummary: '',
        dueAt: '',
      },
    });

    const completeButton = findElement(
      tree,
      (element) => element.type === 'button' && element.props['data-action'] === 'complete-review',
    );
    const partialButton = findElement(
      tree,
      (element) => element.type === 'button' && element.props['data-action'] === 'partial-review',
    );
    const rescheduleButton = findElement(
      tree,
      (element) => element.type === 'button' && element.props['data-action'] === 'reschedule-review',
    );

    expect(completeButton.props.disabled).toBe(true);
    expect(partialButton.props.disabled).toBe(true);
    expect(rescheduleButton.props.disabled).toBe(true);
  });
});
