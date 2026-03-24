import { jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SessionAskComposer from '../SessionAskComposer.js';

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

describe('SessionAskComposer', () => {
  test('propagates message edits and submits follow-up turns when ready', () => {
    const onChange = jest.fn();
    const onSubmit = jest.fn();
    const tree = SessionAskComposer({
      composer: {
        message: '',
        status: 'idle',
        canSubmit: true,
      },
      onChange,
      onSubmit,
    });

    const textarea = findElement(tree, (element) => element.type === 'textarea');
    textarea.props.onChange({ target: { value: 'Give me the next hint only.' } });

    const form = findElement(tree, (element) => element.type === 'form');
    form.props.onSubmit({ preventDefault() {} });

    expect(onChange).toHaveBeenCalledWith('Give me the next hint only.');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('blocks invalid submissions and renders the request error state', () => {
    const onSubmit = jest.fn();
    const tree = SessionAskComposer({
      composer: {
        message: '',
        status: 'submitting',
        canSubmit: false,
        errorMessage: 'Session update is still in flight.',
      },
      onChange: jest.fn(),
      onSubmit,
    });

    const form = findElement(tree, (element) => element.type === 'form');
    form.props.onSubmit({ preventDefault() {} });

    const html = renderToStaticMarkup(tree);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(html).toContain('Session update is still in flight.');
    expect(html).toContain('Sending follow-up...');
  });
});
