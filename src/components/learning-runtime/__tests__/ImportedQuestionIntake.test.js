import { jest } from '@jest/globals';
import React from 'react';
import ImportedQuestionIntake, {
  buildImportQuestionPayload,
  buildImportedQuestionSessionPayload,
  canSubmitImportedQuestionDraft,
  createImportedQuestionDraft,
} from '../ImportedQuestionIntake.js';

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

describe('ImportedQuestionIntake', () => {
  test('builds import payloads from pasted content and runtime context selection', () => {
    const payload = buildImportQuestionPayload(createImportedQuestionDraft({
      promptValue: 'Solve 2sinx = 1 for 0 <= x <= 360.',
      runtimeContextId: '9709.trigonometry.equations',
    }));

    expect(payload).toEqual({
      subject_code: '9709',
      prompt_representation: {
        type: 'text',
        value: 'Solve 2sinx = 1 for 0 <= x <= 360.',
      },
      provenance_summary: {
        import_source: 'manual_paste',
      },
      classification: {
        primary_question_type_id: '9709.trigonometry.equations',
        primary_topic_id: 'topic-trig-equations',
      },
    });
  });

  test('builds guided-solve session payloads anchored to imported questions', () => {
    const payload = buildImportedQuestionSessionPayload({
      draft: createImportedQuestionDraft({
        runtimeContextId: '9709.integration.application',
      }),
      importResult: {
        question: {
          questionId: 'question-import-1',
          primaryQuestionTypeId: '9709.integration.application',
        },
      },
    });

    expect(payload).toEqual({
      subject_code: '9709',
      mode: 'guided_solve',
      session_goal: 'Work through imported question',
      anchor_kind: 'question',
      anchor_ref: {
        kind: 'question',
        question_id: 'question-import-1',
      },
      current_question_id: 'question-import-1',
      current_question_type_id: '9709.integration.application',
    });
  });

  test('only submits once the intake has pasted content and wires field changes back up', () => {
    expect(canSubmitImportedQuestionDraft(createImportedQuestionDraft())).toBe(false);

    const onChange = jest.fn();
    const onSubmit = jest.fn();
    const tree = ImportedQuestionIntake({
      intake: {
        draft: createImportedQuestionDraft(),
        status: 'idle',
        canSubmit: false,
      },
      onChange,
      onSubmit,
    });

    const contextSelect = findElement(
      tree,
      (element) => element.type === 'select' && element.props.name === 'runtimeContextId',
    );
    contextSelect.props.onChange({ target: { value: '9709.integration.application' } });

    const promptTextarea = findElement(
      tree,
      (element) => element.type === 'textarea' && element.props.name === 'promptValue',
    );
    promptTextarea.props.onChange({ target: { value: 'Find the value of integral of (2x+1)(x^2+x)^4 dx.' } });

    const blockedForm = findElement(tree, (element) => element.type === 'form');
    blockedForm.props.onSubmit({ preventDefault() {} });

    const readyTree = ImportedQuestionIntake({
      intake: {
        draft: createImportedQuestionDraft({
          promptValue: 'Find the value of integral of (2x+1)(x^2+x)^4 dx.',
          runtimeContextId: '9709.integration.application',
        }),
        status: 'idle',
        canSubmit: true,
      },
      onChange: jest.fn(),
      onSubmit,
    });

    const readyForm = findElement(readyTree, (element) => element.type === 'form');
    readyForm.props.onSubmit({ preventDefault() {} });

    expect(onChange).toHaveBeenNthCalledWith(1, { runtimeContextId: '9709.integration.application' });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      promptValue: 'Find the value of integral of (2x+1)(x^2+x)^4 dx.',
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
