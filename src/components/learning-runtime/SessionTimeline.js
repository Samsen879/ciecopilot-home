import React from 'react';

const h = React.createElement;

function renderEntry(entry) {
  const metaLines = [];

  if (entry.questionTypeId) {
    metaLines.push(
      h('p', { key: 'question-type', className: 'text-sm text-slate-600' }, `Question type: ${entry.questionTypeId}`),
    );
  }

  if (entry.fallbackReasonCode) {
    metaLines.push(
      h('p', { key: 'fallback-reason', className: 'text-sm text-amber-700' }, `Fallback reason: ${entry.fallbackReasonCode}`),
    );
  }

  if (entry.learningSignalPosture) {
    metaLines.push(
      h('p', { key: 'learning-signal', className: 'text-sm text-slate-600' }, `Learning signal posture: ${entry.learningSignalPosture}`),
    );
  }

  if (entry.evidenceTopicPath) {
    metaLines.push(
      h('p', { key: 'evidence-topic', className: 'text-sm text-slate-600' }, `Evidence topic: ${entry.evidenceTopicPath}`),
    );
  }

  return h('article', {
    key: entry.id,
    className: 'rounded-2xl border border-slate-200 bg-slate-50 p-4',
  }, [
    h('h3', { key: 'title', className: 'text-base font-semibold text-slate-950' }, entry.title),
    entry.message
      ? h('p', { key: 'message', className: 'mt-2 text-sm leading-6 text-slate-700' }, entry.message)
      : null,
    entry.description
      ? h('p', { key: 'description', className: 'mt-2 text-sm leading-6 text-slate-700' }, entry.description)
      : null,
    entry.questionId
      ? h('p', { key: 'question-id', className: 'mt-2 text-sm text-slate-700' }, entry.questionId)
      : null,
    ...metaLines,
  ]);
}

export default function SessionTimeline({ timeline = [] }) {
  return h('section', { className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm' }, [
    h('div', { key: 'heading' }, [
      h('p', {
        key: 'eyebrow',
        className: 'text-xs font-semibold uppercase tracking-[0.24em] text-slate-500',
      }, 'Timeline'),
      h('h2', {
        key: 'title',
        className: 'mt-3 text-2xl font-semibold tracking-tight text-slate-950',
      }, 'Session flow'),
    ]),
    h(
      'div',
      { key: 'entries', className: 'mt-6 grid gap-4' },
      timeline.map((entry) => renderEntry(entry)),
    ),
  ]);
}
