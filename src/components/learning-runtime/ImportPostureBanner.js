import React from 'react';

const h = React.createElement;

function renderDetail(label, value) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return null;
  }

  return h('div', {
    key: label,
    className: 'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700',
  }, [
    h('p', { key: 'label', className: 'font-medium text-slate-500' }, label),
    h('p', { key: 'value', className: 'mt-1 text-slate-950' }, String(value)),
  ]);
}

function renderExplanationFactor(factor) {
  if (!factor) {
    return null;
  }

  const code = factor.code || 'factor';
  const summary = factor.summary || factor.status || code;

  return h('li', {
    key: code,
    className: 'rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-950',
  }, [
    h('p', {
      key: 'code',
      className: 'font-medium text-amber-800',
    }, code),
    h('p', {
      key: 'summary',
      className: 'mt-1 leading-6',
    }, summary),
  ]);
}

export default function ImportPostureBanner({
  question,
  posture,
  handoffStatus = 'idle',
  handoffError = null,
  onStartSession = null,
}) {
  if (!question && !posture) {
    return null;
  }

  const isSubmitting = handoffStatus === 'submitting';
  const releaseScopeStatus = posture?.releaseScopeStatus
    ?? question?.releaseScopeStatus
    ?? null;
  const explanation = posture?.explanation || null;

  return h('section', {
    className: 'rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm',
  }, [
    h('div', { key: 'heading' }, [
      h('p', {
        key: 'eyebrow',
        className: 'text-xs font-semibold uppercase tracking-[0.24em] text-amber-700',
      }, 'Returned posture'),
      h('h2', {
        key: 'title',
        className: 'mt-3 text-2xl font-semibold tracking-tight text-slate-950',
      }, 'Imported question ready'),
      h('p', {
        key: 'body',
        className: 'mt-2 text-sm leading-6 text-amber-950',
      }, 'The import call finished and returned the runtime scoring posture below. Review it before you enter the session.'),
    ]),
    h('div', { key: 'details', className: 'mt-6 grid gap-3 md:grid-cols-2' }, [
      renderDetail('Question ID', question?.questionId),
      renderDetail('Question type', question?.primaryQuestionTypeId),
      renderDetail('Release scope status', releaseScopeStatus),
      renderDetail('Fallback mode', posture?.fallbackMode),
      renderDetail('Fallback reason', posture?.fallbackReasonCode),
      renderDetail('Learning signal posture', posture?.learningSignalPosture),
      renderDetail('Classification confidence', posture?.classificationConfidence),
    ].filter(Boolean)),
    explanation?.summary
      ? h('div', {
        key: 'explanation',
        className: 'mt-6 rounded-2xl border border-amber-200 bg-white px-4 py-4 text-sm text-amber-950',
      }, [
        h('p', {
          key: 'title',
          className: 'font-medium text-amber-800',
        }, 'Why this posture is active'),
        h('p', {
          key: 'summary',
          className: 'mt-2 leading-6',
        }, explanation.summary),
      ])
      : null,
    Array.isArray(explanation?.factors) && explanation.factors.length > 0
      ? h('ul', {
        key: 'factors',
        className: 'mt-4 grid gap-3',
      }, explanation.factors.map(renderExplanationFactor).filter(Boolean))
      : null,
    handoffError
      ? h('div', {
        key: 'error',
        className: 'mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700',
      }, handoffError)
      : null,
    onStartSession
      ? h('div', { key: 'actions', className: 'mt-6 flex items-center justify-end' }, [
        h('button', {
          key: 'start-session',
          type: 'button',
          onClick: () => {
            if (!isSubmitting) {
              onStartSession();
            }
          },
          disabled: isSubmitting,
          className: 'rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300',
        }, isSubmitting ? 'Creating runtime session...' : 'Enter runtime session'),
      ])
      : null,
  ]);
}
