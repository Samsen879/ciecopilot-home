import React from 'react';

const h = React.createElement;

function renderField(fieldKey, label, control, hint = null) {
  return h('label', { key: fieldKey, className: 'grid gap-2 text-sm text-slate-700' }, [
    h('span', { key: 'label', className: 'font-medium text-slate-900' }, label),
    control,
    hint
      ? h('span', { key: 'hint', className: 'text-xs leading-5 text-slate-500' }, hint)
      : null,
  ].filter(Boolean));
}

function renderOption(option) {
  return h(
    'option',
    {
      key: option.value,
      value: option.value,
    },
    option.label,
  );
}

function baseInputProps(disabled) {
  return {
    className:
      'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900',
    disabled,
  };
}

function renderTopicField(launcher, onChange, disabled) {
  return renderField(
    'topic',
    'Topic',
    h(
      'select',
      {
        ...baseInputProps(disabled),
        key: 'topic-select',
        name: 'topicId',
        value: launcher?.draft?.topicId || '',
        onChange: (event) => onChange({ topicId: event.target.value }),
      },
      (launcher?.topicOptions || []).map((topic) => renderOption({
        value: topic.topicId,
        label: `${topic.title} (${topic.topicPath})`,
      })),
    ),
    'Concept launches stay questionless until the runtime resolves a concrete question.',
  );
}

function renderAnchorFields(launcher, onChange, disabled) {
  const anchorKind = launcher?.draft?.anchorKind;

  if (anchorKind === 'concept') {
    return [renderTopicField(launcher, onChange, disabled)];
  }

  if (anchorKind === 'question') {
    return [
      renderField(
        'question-id',
        'Question ID',
        h('input', {
          ...baseInputProps(disabled),
          key: 'question-id',
          type: 'text',
          name: 'questionId',
          value: launcher?.draft?.questionId || '',
          onChange: (event) => onChange({ questionId: event.target.value }),
        }),
        'Question anchors automatically use the same value for current_question_id.',
      ),
    ];
  }

  if (anchorKind === 'review_task') {
    return [
      renderField(
        'review-task-id',
        'Review task ID',
        h('input', {
          ...baseInputProps(disabled),
          key: 'review-task-id',
          type: 'text',
          name: 'reviewTaskId',
          value: launcher?.draft?.reviewTaskId || '',
          onChange: (event) => onChange({ reviewTaskId: event.target.value }),
        }),
      ),
    ];
  }

  if (anchorKind === 'artifact') {
    return [
      renderField(
        'artifact-id',
        'Artifact ID',
        h('input', {
          ...baseInputProps(disabled),
          key: 'artifact-id',
          type: 'text',
          name: 'artifactId',
          value: launcher?.draft?.artifactId || '',
          onChange: (event) => onChange({ artifactId: event.target.value }),
        }),
      ),
    ];
  }

  if (anchorKind === 'workspace_slot') {
    return [
      renderTopicField(launcher, onChange, disabled),
      renderField(
        'workspace-id',
        'Workspace ID',
        h('input', {
          ...baseInputProps(disabled),
          key: 'workspace-id',
          type: 'text',
          name: 'workspaceId',
          value: launcher?.draft?.workspaceId || '',
          onChange: (event) => onChange({ workspaceId: event.target.value }),
        }),
      ),
      renderField(
        'slot-key',
        'Slot key',
        h(
          'select',
          {
            ...baseInputProps(disabled),
            key: 'slot-key',
            name: 'slotKey',
            value: launcher?.draft?.slotKey || 'review_queue',
            onChange: (event) => onChange({ slotKey: event.target.value }),
          },
          (launcher?.slotOptions || []).map(renderOption),
        ),
        'review_queue is the only slot that may legally start spaced_review.',
      ),
    ];
  }

  return [];
}

export default function SessionLauncher({
  launcher,
  onChange = () => {},
  onSubmit = () => {},
}) {
  const isSubmitting = launcher?.status === 'submitting';
  const canSubmit = Boolean(launcher?.canSubmit) && !isSubmitting;
  const anchorFields = renderAnchorFields(launcher, onChange, isSubmitting);

  return h('section', { className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm' }, [
    h('div', { key: 'heading' }, [
      h('p', {
        key: 'eyebrow',
        className: 'text-xs font-semibold uppercase tracking-[0.24em] text-slate-500',
      }, 'Launch'),
      h('h2', {
        key: 'title',
        className: 'mt-3 text-2xl font-semibold tracking-tight text-slate-950',
      }, 'Launch a learning session'),
      h('p', {
        key: 'body',
        className: 'mt-2 text-sm leading-6 text-slate-600',
      }, 'Choose a valid anchor payload. The runtime keeps questionless sessions legal instead of inventing placeholder question ids.'),
    ]),
    h('form', {
      key: 'form',
      className: 'mt-6 grid gap-4 lg:grid-cols-2',
      onSubmit: (event) => {
        event.preventDefault();
        if (!canSubmit) {
          return;
        }
        onSubmit();
      },
    }, [
      renderField(
        'subject-code',
        'Subject code',
        h('input', {
          ...baseInputProps(true),
          key: 'subject-code',
          type: 'text',
          name: 'subjectCode',
          value: launcher?.draft?.subjectCode || '',
          readOnly: true,
        }),
      ),
      renderField(
        'mode',
        'Mode',
        h(
          'select',
          {
            ...baseInputProps(isSubmitting),
            key: 'mode',
            name: 'mode',
            value: launcher?.draft?.mode || '',
            onChange: (event) => onChange({ mode: event.target.value }),
          },
          (launcher?.modeOptions || []).map(renderOption),
        ),
      ),
      renderField(
        'anchor-kind',
        'Anchor kind',
        h(
          'select',
          {
            ...baseInputProps(isSubmitting),
            key: 'anchor-kind',
            name: 'anchorKind',
            value: launcher?.draft?.anchorKind || '',
            onChange: (event) => onChange({ anchorKind: event.target.value }),
          },
          (launcher?.anchorOptions || []).map(renderOption),
        ),
      ),
      renderField(
        'question-type-id',
        'Current question type ID',
        h('input', {
          ...baseInputProps(isSubmitting),
          key: 'question-type',
          type: 'text',
          name: 'currentQuestionTypeId',
          value: launcher?.draft?.currentQuestionTypeId || '',
          onChange: (event) => onChange({ currentQuestionTypeId: event.target.value }),
        }),
        'Optional. Type context may exist even when current_question_id is null.',
      ),
      ...anchorFields,
      launcher?.draft?.anchorKind !== 'concept' && launcher?.draft?.anchorKind !== 'question'
        ? renderField(
          'current-question-id',
          'Current question ID',
          h('input', {
            ...baseInputProps(isSubmitting),
            key: 'current-question-id',
            type: 'text',
            name: 'currentQuestionId',
            value: launcher?.draft?.currentQuestionId || '',
            onChange: (event) => onChange({ currentQuestionId: event.target.value }),
          }),
          'Optional. Leave this blank for legal questionless entry.',
        )
        : null,
      h('label', { key: 'session-goal', className: 'grid gap-2 text-sm text-slate-700 lg:col-span-2' }, [
        h('span', { key: 'label', className: 'font-medium text-slate-900' }, 'Session goal'),
        h('textarea', {
          ...baseInputProps(isSubmitting),
          key: 'textarea',
          rows: 3,
          name: 'sessionGoal',
          value: launcher?.draft?.sessionGoal || '',
          onChange: (event) => onChange({ sessionGoal: event.target.value }),
        }),
      ]),
      launcher?.errorMessage
        ? h('div', {
          key: 'error',
          className: 'rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 lg:col-span-2',
        }, launcher.errorMessage)
        : null,
      h('div', { key: 'actions', className: 'flex items-center justify-end lg:col-span-2' }, [
        h('button', {
          key: 'submit',
          type: 'submit',
          disabled: !canSubmit,
          className: 'rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300',
        }, isSubmitting ? 'Launching session...' : 'Launch session'),
      ]),
    ].filter(Boolean)),
  ]);
}
