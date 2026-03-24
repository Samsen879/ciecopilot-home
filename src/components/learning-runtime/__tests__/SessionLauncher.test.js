import { jest } from '@jest/globals';
import React from 'react';
import SessionLauncher from '../SessionLauncher.js';
import { createSessionLaunchDraft } from '../view-models/session-live-state.js';

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

describe('SessionLauncher', () => {
  test('wires field changes back to the container draft state', () => {
    const onChange = jest.fn();
    const tree = SessionLauncher({
      launcher: {
        draft: createSessionLaunchDraft(),
        status: 'idle',
        canSubmit: true,
      },
      onChange,
      onSubmit: jest.fn(),
    });

    const modeSelect = findElement(
      tree,
      (element) => element.type === 'select' && element.props.name === 'mode',
    );
    modeSelect.props.onChange({ target: { value: 'spaced_review' } });

    const topicSelect = findElement(
      tree,
      (element) => element.type === 'select' && element.props.name === 'topicId',
    );
    topicSelect.props.onChange({ target: { value: 'topic-trig-equations' } });

    expect(onChange).toHaveBeenNthCalledWith(1, { mode: 'spaced_review' });
    expect(onChange).toHaveBeenNthCalledWith(2, { topicId: 'topic-trig-equations' });
  });

  test('submits only when the launcher is ready', () => {
    const onSubmit = jest.fn();
    const readyTree = SessionLauncher({
      launcher: {
        draft: createSessionLaunchDraft(),
        status: 'idle',
        canSubmit: true,
      },
      onChange: jest.fn(),
      onSubmit,
    });

    const readyForm = findElement(readyTree, (element) => element.type === 'form');
    readyForm.props.onSubmit({ preventDefault() {} });

    const blockedTree = SessionLauncher({
      launcher: {
        draft: createSessionLaunchDraft(),
        status: 'submitting',
        canSubmit: false,
      },
      onChange: jest.fn(),
      onSubmit,
    });

    const blockedForm = findElement(blockedTree, (element) => element.type === 'form');
    blockedForm.props.onSubmit({ preventDefault() {} });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
