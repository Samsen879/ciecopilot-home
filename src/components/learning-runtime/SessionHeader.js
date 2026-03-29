import React from 'react';

const h = React.createElement;

function renderPill(label, value) {
  if (!value && value !== false) {
    return null;
  }

  return h(
    'div',
    {
      key: `${label}:${value}`,
      className: 'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700',
    },
    [
      h('span', { key: 'label', className: 'font-medium text-slate-500' }, `${label}: `),
      h('span', { key: 'value', className: 'text-slate-900' }, String(value)),
    ],
  );
}

export default function SessionHeader({ header, session }) {
  const hasSession = Boolean(session?.sessionId);
  const pills = [
    renderPill('Anchor', header?.anchorKind),
    renderPill('Topic', header?.topicPath),
    hasSession ? renderPill('Session state', session?.state) : null,
    header?.fallbackMode ? renderPill('Fallback', header.fallbackMode) : null,
  ].filter(Boolean);

  return h('section', { className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm' }, [
    h('p', {
      key: 'eyebrow',
      className: 'text-xs font-semibold uppercase tracking-[0.24em] text-slate-500',
    }, 'Learning runtime session'),
    h('div', { key: 'content', className: 'mt-3 flex flex-col gap-3' }, [
      h('div', { key: 'title-block' }, [
        h('h1', {
          key: 'title',
          className: 'text-3xl font-semibold tracking-tight text-slate-950',
        }, header?.modeLabel || (hasSession ? 'learning session' : 'launch a learning session')),
        h('p', {
          key: 'subtitle',
          className: 'mt-2 text-sm leading-6 text-slate-600',
        }, hasSession
          ? (session?.sessionGoal || header?.anchorLabel || 'Session context is loading.')
          : 'Launch the first interactive runtime session from a valid anchor payload, then keep the ask loop inside the same session.'),
      ]),
      h('div', { key: 'pills', className: 'flex flex-wrap gap-3' }, pills),
      header?.fallbackMode
        ? h('div', {
          key: 'fallback-banner',
          className: 'rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900',
        }, [
          h('p', { key: 'title', className: 'font-semibold' }, 'Runtime fallback is active'),
          h('p', { key: 'body', className: 'mt-1 leading-6' }, [
            `Fallback mode: ${header.fallbackMode}.`,
            header?.fallbackReasonCode ? ` Reason: ${header.fallbackReasonCode}.` : '',
            header?.learningSignalPosture ? ` Learning signal posture: ${header.learningSignalPosture}.` : '',
          ].join('')),
          header?.runtimeSummary
            ? h('p', {
              key: 'summary',
              className: 'mt-1 leading-6',
            }, header.runtimeSummary)
            : null,
          Array.isArray(header?.fallbackCapabilities) && header.fallbackCapabilities.length > 0
            ? h('p', {
              key: 'capabilities',
              className: 'mt-1 leading-6',
            }, `Conservative capabilities: ${header.fallbackCapabilities.join(', ')}.`)
            : null,
        ])
        : null,
    ]),
  ]);
}
