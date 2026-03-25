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

function renderPostMortem(viewModel, onPostMortemLaunch) {
  const postMortem = viewModel?.postMortem || null;
  if (!postMortem?.visible) {
    return null;
  }

  const scoringPosture = postMortem.scoringPosture || null;
  const diagnosticFocus = postMortem.diagnosticFocus || {};
  const evidenceRows = [
    diagnosticFocus.sourceQuestionId
      ? `Question: ${diagnosticFocus.sourceQuestionId}`
      : null,
    diagnosticFocus.sourceAttemptId
      ? `Attempt: ${diagnosticFocus.sourceAttemptId}`
      : null,
    diagnosticFocus.sourceMarkRunId
      ? `Mark run: ${diagnosticFocus.sourceMarkRunId}`
      : null,
  ].filter(Boolean);

  return h('section', {
    key: 'post-mortem',
    className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
  }, [
    h('div', { key: 'heading' }, [
      h('p', {
        key: 'eyebrow',
        className: 'text-xs font-semibold uppercase tracking-[0.24em] text-slate-500',
      }, 'Post-mortem review'),
      h('h2', {
        key: 'title',
        className: 'mt-3 text-2xl font-semibold tracking-tight text-slate-950',
      }, postMortem.title || 'Post-mortem review'),
      h('p', {
        key: 'summary',
        className: 'mt-2 text-sm leading-6 text-slate-600',
      }, postMortem.summary),
    ]),
    scoringPosture && scoringPosture.authoritativeScoringAllowed === false
      ? h('div', {
        key: 'scoring-posture',
        className: 'mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900',
      }, [
        h('p', { key: 'title', className: 'font-semibold' }, 'Conservative post-mortem posture'),
        h('p', { key: 'body', className: 'mt-1 leading-6' }, [
          `Release scope: ${scoringPosture.releaseScopeStatus || 'non_released_fallback'}.`,
          scoringPosture.fallbackReasonCode ? ` Reason: ${scoringPosture.fallbackReasonCode}.` : '',
        ].join('')),
      ])
      : null,
    h('div', { key: 'diagnostic', className: 'mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4' }, [
      h('h3', {
        key: 'title',
        className: 'text-base font-semibold text-slate-950',
      }, diagnosticFocus.title || 'Misconception-focused diagnostic'),
      diagnosticFocus.summary
        ? h('p', {
          key: 'body',
          className: 'mt-2 text-sm leading-6 text-slate-700',
        }, diagnosticFocus.summary)
        : null,
      ...evidenceRows.map((row) => h('p', {
        key: row,
        className: 'mt-2 text-sm text-slate-600',
      }, row)),
    ].filter(Boolean)),
    postMortem.misconceptions?.length
      ? h('div', { key: 'misconceptions', className: 'mt-5' }, [
        h('p', {
          key: 'label',
          className: 'text-sm font-medium text-slate-500',
        }, 'Misconceptions in focus'),
        h('div', {
          key: 'chips',
          className: 'mt-3 flex flex-wrap gap-2',
        }, postMortem.misconceptions.map((item) => h('span', {
          key: item.tag,
          className: 'rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-900',
        }, item.label))),
      ])
      : null,
    postMortem.artifactCandidates?.length
      ? h('div', { key: 'artifacts', className: 'mt-5 grid gap-3' }, [
        h('p', {
          key: 'label',
          className: 'text-sm font-medium text-slate-500',
        }, 'Misconception-focused artifacts'),
        ...postMortem.artifactCandidates.map((candidate) => h('article', {
          key: candidate.artifactId,
          className: 'rounded-2xl border border-slate-200 bg-slate-50 p-4',
        }, [
          h('div', {
            key: 'header',
            className: 'flex flex-wrap items-start justify-between gap-3',
          }, [
            h('div', { key: 'copy' }, [
              h('h3', {
                key: 'title',
                className: 'text-base font-semibold text-slate-950',
              }, candidate.artifactId),
              h('p', {
                key: 'meta',
                className: 'mt-1 text-sm text-slate-600',
              }, candidate.artifactKind),
            ]),
            candidate.launch
              ? h('button', {
                key: 'launch',
                type: 'button',
                onClick: () => onPostMortemLaunch(candidate.launch.launchPayload),
                className: 'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900',
              }, candidate.launch.ctaLabel || 'Open artifact')
              : null,
          ].filter(Boolean)),
        ])),
      ])
      : null,
    postMortem.repairHandoff
      ? h('div', {
        key: 'repair-handoff',
        className: 'mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4',
      }, [
        h('h3', {
          key: 'title',
          className: 'text-base font-semibold text-slate-950',
        }, postMortem.repairHandoff.title || 'Repair handoff'),
        h('p', {
          key: 'body',
          className: 'mt-2 text-sm leading-6 text-slate-700',
        }, postMortem.repairHandoff.message),
        postMortem.repairHandoff.launchPayload
          ? h('button', {
            key: 'launch',
            type: 'button',
            onClick: () => onPostMortemLaunch(postMortem.repairHandoff.launchPayload),
            className: 'mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800',
          }, postMortem.repairHandoff.actionLabel || 'Launch repair session')
          : null,
      ])
      : null,
  ].filter(Boolean));
}

export default function LearningSessionShell({
  viewModel,
  onLauncherChange = () => {},
  onLaunch = () => {},
  onPostMortemLaunch = () => {},
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
    hasSession ? renderPostMortem(viewModel, onPostMortemLaunch) : null,
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
