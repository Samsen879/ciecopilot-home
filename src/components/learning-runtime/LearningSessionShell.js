import React from 'react';
import SessionAskComposer from './SessionAskComposer.js';
import SessionHeader from './SessionHeader.js';
import SessionLauncher from './SessionLauncher.js';
import SessionTimeline from './SessionTimeline.js';

const h = React.createElement;

function renderSessionMeta(session) {
  const rows = [
    {
      label: 'Session state',
      value: session?.state || 'active',
    },
    {
      label: 'Question type',
      value: session?.currentQuestionTypeId || 'not set',
    },
  ];

  return h(
    'dl',
    { className: 'grid gap-4 sm:grid-cols-2' },
    rows.map((row) => h(
      'div',
      {
        key: row.label,
        className: 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm',
      },
      [
        h('dt', { key: 'label', className: 'text-sm font-medium text-slate-500' }, row.label),
        h('dd', { key: 'value', className: 'mt-2 text-lg font-semibold text-slate-950' }, row.value),
      ],
    )),
  );
}

export default function LearningSessionShell({
  viewModel,
  onLauncherChange = () => {},
  onLaunch = () => {},
  onAskChange = () => {},
  onAsk = () => {},
}) {
  const session = viewModel?.session || {};
  const hasSession = Boolean(viewModel?.hasSession);

  return h('div', { className: 'grid gap-6' }, [
    h(SessionHeader, {
      key: 'header',
      header: viewModel?.header || {},
      session,
    }),
    !hasSession
      ? h(SessionLauncher, {
        key: 'launcher',
        launcher: viewModel?.launcher || {},
        onChange: onLauncherChange,
        onSubmit: onLaunch,
      })
      : null,
    hasSession ? h('div', { key: 'meta' }, renderSessionMeta(session)) : null,
    hasSession && session.hasQuestion && session.currentQuestionId
      ? h('section', {
        key: 'question-card',
        className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
      }, [
        h('h2', {
          key: 'title',
          className: 'text-xl font-semibold tracking-tight text-slate-950',
        }, 'Current question'),
        h('p', {
          key: 'value',
          className: 'mt-2 text-sm text-slate-700',
        }, session.currentQuestionId),
      ])
      : null,
    hasSession
      ? h(SessionTimeline, {
        key: 'timeline',
        timeline: viewModel?.timeline || [],
        isUpdating: viewModel?.timelineUpdating || false,
      })
      : null,
    hasSession
      ? h(SessionAskComposer, {
        key: 'composer',
        composer: viewModel?.composer || {},
        onChange: onAskChange,
        onSubmit: onAsk,
      })
      : null,
  ].filter(Boolean));
}
