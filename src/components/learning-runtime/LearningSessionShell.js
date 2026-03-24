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

function renderContinuityCard(title, body, meta = []) {
  return h(
    'article',
    {
      key: title,
      className: 'rounded-2xl border border-slate-200 bg-slate-50 p-4',
    },
    [
      h('h3', { key: 'title', className: 'text-base font-semibold text-slate-950' }, title),
      body
        ? h('p', { key: 'body', className: 'mt-2 text-sm leading-6 text-slate-700' }, body)
        : null,
      ...meta,
    ],
  );
}

function renderContinuity(viewModel) {
  const continuity = viewModel?.continuity || {};
  if (!continuity.showContinuity) {
    return null;
  }

  const cards = [];

  if (continuity.resumeGuidance) {
    const resume = continuity.resumeGuidance;
    const meta = [
      resume.summary
        ? h('p', {
          key: 'summary',
          className: 'mt-2 text-sm text-slate-600',
        }, `Summary: ${resume.summary}`)
        : null,
      resume.parentSessionId
        ? h('p', {
          key: 'parent-session',
          className: 'mt-2 text-sm text-slate-600',
        }, `Parent session: ${resume.parentSessionId}`)
        : null,
    ].filter(Boolean);

    cards.push(
      renderContinuityCard(
        resume.title || 'Resume guidance',
        resume.message,
        meta,
      ),
    );
  }

  if (continuity.lineage) {
    const lineage = continuity.lineage;
    cards.push(
      renderContinuityCard(
        'Session lineage',
        lineage.parentSessionId
          ? `This session continues from ${lineage.parentSessionId}.`
          : 'This session is the current continuity root.',
        [
          lineage.handoffKindLabel
            ? h('p', {
              key: 'handoff-kind',
              className: 'mt-2 text-sm text-slate-600',
            }, `Handoff kind: ${lineage.handoffKindLabel}`)
            : null,
          lineage.summary
            ? h('p', {
              key: 'lineage-summary',
              className: 'mt-2 text-sm text-slate-600',
            }, `Summary: ${lineage.summary}`)
            : null,
        ].filter(Boolean),
      ),
    );
  }

  if (continuity.suggestedHandoff) {
    const suggestion = continuity.suggestedHandoff;
    cards.push(
      renderContinuityCard(
        'Suggested handoff',
        suggestion.message,
        [
          suggestion.handoffKindLabel
            ? h('p', {
              key: 'suggested-kind',
              className: 'mt-2 text-sm text-slate-600',
            }, `Next step: ${suggestion.handoffKindLabel}`)
            : null,
          suggestion.reasonCode
            ? h('p', {
              key: 'suggested-reason',
              className: 'mt-2 text-sm text-slate-600',
            }, `Reason: ${suggestion.reasonCode}`)
            : null,
        ].filter(Boolean),
      ),
    );
  }

  return h('section', {
    key: 'continuity',
    className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
  }, [
    h('div', { key: 'heading' }, [
      h('p', {
        key: 'eyebrow',
        className: 'text-xs font-semibold uppercase tracking-[0.24em] text-slate-500',
      }, 'Continuity'),
      h('h2', {
        key: 'title',
        className: 'mt-3 text-2xl font-semibold tracking-tight text-slate-950',
      }, 'Resume and handoff'),
      h('p', {
        key: 'body',
        className: 'mt-2 text-sm leading-6 text-slate-600',
      }, 'Use the stored lineage, summary snapshot, and handoff guidance to continue without resetting the runtime context.'),
    ]),
    h('div', { key: 'cards', className: 'mt-6 grid gap-4' }, cards),
  ]);
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
    hasSession ? renderContinuity(viewModel) : null,
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
