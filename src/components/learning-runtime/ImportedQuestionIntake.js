import React from 'react';

const h = React.createElement;

const DEFAULT_SUBJECT_CODE = '9709';
const DEFAULT_RUNTIME_CONTEXT_ID = '9709.trigonometry.equations';

export const IMPORTED_QUESTION_RUNTIME_CONTEXT_OPTIONS = Object.freeze([
  {
    value: '9709.trigonometry.equations',
    label: 'Trigonometric equations',
    topicId: 'topic-trig-equations',
    topicPath: '9709/trigonometry/equations',
    questionTypeId: '9709.trigonometry.equations',
    postureLabel: 'pilot runtime family',
  },
  {
    value: '9709.trigonometry.identities',
    label: 'Trigonometric identities',
    topicId: 'topic-trig-identities',
    topicPath: '9709/trigonometry/identities',
    questionTypeId: '9709.trigonometry.identities',
    postureLabel: 'pilot runtime family',
  },
  {
    value: '9709.integration.application',
    label: 'Integration applications',
    topicId: 'topic-integration-1',
    topicPath: '9709.integration.application',
    questionTypeId: '9709.integration.application',
    postureLabel: 'fallback-only family',
  },
]);

function normalizeString(value) {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  return String(value).trim();
}

function findRuntimeContextOption(runtimeContextId) {
  return (
    IMPORTED_QUESTION_RUNTIME_CONTEXT_OPTIONS.find((option) => option.value === runtimeContextId)
    || IMPORTED_QUESTION_RUNTIME_CONTEXT_OPTIONS[0]
    || null
  );
}

function baseInputProps(disabled) {
  return {
    className:
      'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900',
    disabled,
  };
}

function renderField(fieldKey, label, control, hint = null) {
  return h('label', { key: fieldKey, className: 'grid gap-2 text-sm text-slate-700' }, [
    h('span', { key: 'label', className: 'font-medium text-slate-900' }, label),
    control,
    hint
      ? h('span', { key: 'hint', className: 'text-xs leading-5 text-slate-500' }, hint)
      : null,
  ].filter(Boolean));
}

export function createImportedQuestionDraft(overrides = {}) {
  const runtimeContextId = normalizeString(overrides.runtimeContextId)
    || DEFAULT_RUNTIME_CONTEXT_ID;
  const runtimeContext = findRuntimeContextOption(runtimeContextId);

  return {
    subjectCode: normalizeString(overrides.subjectCode) || DEFAULT_SUBJECT_CODE,
    runtimeContextId: runtimeContext?.value ?? DEFAULT_RUNTIME_CONTEXT_ID,
    promptValue: normalizeString(overrides.promptValue),
    topicId: normalizeString(overrides.topicId) || runtimeContext?.topicId || '',
    topicPath: normalizeString(overrides.topicPath) || runtimeContext?.topicPath || '',
    questionTypeId:
      normalizeString(overrides.questionTypeId) || runtimeContext?.questionTypeId || '',
  };
}

export function patchImportedQuestionDraft(currentDraft = {}, patch = {}) {
  const nextDraft = {
    ...createImportedQuestionDraft(currentDraft),
    ...patch,
  };

  const runtimeContext = findRuntimeContextOption(
    normalizeString(patch.runtimeContextId) || nextDraft.runtimeContextId,
  );

  if (runtimeContext) {
    nextDraft.runtimeContextId = runtimeContext.value;
    nextDraft.topicId = runtimeContext.topicId;
    nextDraft.topicPath = runtimeContext.topicPath;
    nextDraft.questionTypeId = runtimeContext.questionTypeId;
  }

  return createImportedQuestionDraft(nextDraft);
}

export function canSubmitImportedQuestionDraft(draft = {}) {
  const normalizedDraft = createImportedQuestionDraft(draft);
  return Boolean(
    normalizedDraft.subjectCode
    && normalizedDraft.runtimeContextId
    && normalizedDraft.promptValue,
  );
}

export function buildImportQuestionPayload(draft = {}) {
  const normalizedDraft = createImportedQuestionDraft(draft);

  return {
    subject_code: normalizedDraft.subjectCode,
    prompt_representation: {
      type: 'text',
      value: normalizedDraft.promptValue,
    },
    provenance_summary: {
      import_source: 'manual_paste',
    },
    classification: {
      primary_question_type_id: normalizedDraft.questionTypeId || null,
      primary_topic_id: null,
    },
  };
}

export function buildImportedQuestionSessionPayload({
  draft = {},
  importResult = {},
} = {}) {
  const normalizedDraft = createImportedQuestionDraft(draft);
  const question = importResult?.question || {};
  const questionId = question.questionId ?? null;
  const currentQuestionTypeId = question.primaryQuestionTypeId
    ?? normalizedDraft.questionTypeId
    ?? null;

  if (!questionId) {
    return null;
  }

  return {
    subject_code: normalizedDraft.subjectCode,
    mode: 'guided_solve',
    session_goal: 'Work through imported question',
    anchor_kind: 'question',
    anchor_ref: {
      kind: 'question',
      question_id: questionId,
    },
    current_question_id: questionId,
    current_question_type_id: currentQuestionTypeId,
  };
}

export default function ImportedQuestionIntake({
  intake,
  onChange = () => {},
  onSubmit = () => {},
}) {
  const draft = createImportedQuestionDraft(intake?.draft || {});
  const isSubmitting = intake?.status === 'submitting';
  const canSubmit = typeof intake?.canSubmit === 'boolean'
    ? intake.canSubmit
    : canSubmitImportedQuestionDraft(draft);
  const runtimeContext = findRuntimeContextOption(draft.runtimeContextId);

  return h('section', { className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm' }, [
    h('div', { key: 'heading' }, [
      h('p', {
        key: 'eyebrow',
        className: 'text-xs font-semibold uppercase tracking-[0.24em] text-slate-500',
      }, 'Imported question'),
      h('h2', {
        key: 'title',
        className: 'mt-3 text-2xl font-semibold tracking-tight text-slate-950',
      }, 'Import into runtime'),
      h('p', {
        key: 'body',
        className: 'mt-2 text-sm leading-6 text-slate-600',
      }, 'Paste a question, create a durable runtime question, and review the returned scoring posture before you enter the session.'),
    ]),
    h('form', {
      key: 'form',
      className: 'mt-6 grid gap-4',
      onSubmit: (event) => {
        event.preventDefault();
        if (!canSubmit || isSubmitting) {
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
          value: draft.subjectCode,
          readOnly: true,
        }),
      ),
      renderField(
        'runtime-context',
        'Runtime context',
        h(
          'select',
          {
            ...baseInputProps(isSubmitting),
            key: 'runtime-context',
            name: 'runtimeContextId',
            value: draft.runtimeContextId,
            onChange: (event) => onChange({ runtimeContextId: event.target.value }),
          },
          IMPORTED_QUESTION_RUNTIME_CONTEXT_OPTIONS.map((option) => h(
            'option',
            {
              key: option.value,
              value: option.value,
            },
            `${option.label} (${option.postureLabel})`,
          )),
        ),
        'Choose the intended runtime context so the imported question can anchor to a canonical topic.',
      ),
      renderField(
        'topic-path',
        'Canonical topic path',
        h('input', {
          ...baseInputProps(true),
          key: 'topic-path',
          type: 'text',
          name: 'topicPath',
          value: runtimeContext?.topicPath || draft.topicPath,
          readOnly: true,
        }),
      ),
      renderField(
        'prompt-value',
        'Question content',
        h('textarea', {
          ...baseInputProps(isSubmitting),
          key: 'prompt-value',
          rows: 7,
          name: 'promptValue',
          value: draft.promptValue,
          onChange: (event) => onChange({ promptValue: event.target.value }),
        }),
        'The intake stores this as a durable imported question instead of route-scoped chat state.',
      ),
      intake?.errorMessage
        ? h('div', {
          key: 'error',
          className: 'rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700',
        }, intake.errorMessage)
        : null,
      h('div', { key: 'actions', className: 'flex items-center justify-end' }, [
        h('button', {
          key: 'submit',
          type: 'submit',
          disabled: !canSubmit || isSubmitting,
          className: 'rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300',
        }, isSubmitting ? 'Importing question...' : 'Import question'),
      ]),
    ].filter(Boolean)),
  ]);
}
