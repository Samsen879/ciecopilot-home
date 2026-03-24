import React from 'react';
import ReviewTaskActionBar from './ReviewTaskActionBar.js';

const h = React.createElement;

function badgeClassName(tone) {
  switch (tone) {
    case 'success':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
    case 'warning':
      return 'bg-amber-50 text-amber-800 border border-amber-200';
    case 'danger':
      return 'bg-rose-50 text-rose-800 border border-rose-200';
    default:
      return 'bg-white text-slate-600 border border-slate-200';
  }
}

function renderBadge(key, label, tone = 'neutral') {
  return h('span', {
    key,
    className: `rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] ${badgeClassName(tone)}`,
  }, label);
}

function renderSummaryChip(key, label, value) {
  return h('div', {
    key,
    className: 'rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3',
  }, [
    h('p', {
      key: 'label',
      className: 'text-xs font-semibold uppercase tracking-[0.18em] text-slate-500',
    }, label),
    h('p', {
      key: 'value',
      className: 'mt-2 text-lg font-semibold text-slate-950',
    }, String(value)),
  ]);
}

function renderReviewItem(item, {
  drafts = {},
  mutationStateByTaskId = {},
  onComplete = () => {},
  onDraftChange = () => {},
  onLaunch = () => {},
  onOpenWorkspace = null,
  onReschedule = () => {},
} = {}) {
  return h('li', {
    key: item.reviewTaskId,
    className: 'rounded-3xl border border-slate-200 bg-slate-50 p-5',
  }, [
    h('div', {
      key: 'header',
      className: 'flex flex-wrap items-start justify-between gap-3',
    }, [
      h('div', { key: 'title-group', className: 'min-w-0 flex-1' }, [
        h('p', {
          key: 'mode',
          className: 'text-sm font-semibold text-slate-900',
        }, item.modeLabel),
        h('p', {
          key: 'target',
          className: 'mt-1 text-base font-semibold text-slate-950',
        }, item.targetQuestionTypeTitle || item.targetTopicPath || item.reviewTaskId),
        item.targetTopicPath
          ? h('p', {
            key: 'topic-path',
            className: 'mt-1 text-sm text-slate-600',
          }, item.targetTopicPath)
          : null,
      ].filter(Boolean)),
      h('div', {
        key: 'badges',
        className: 'flex flex-wrap justify-end gap-2',
      }, [
        renderBadge('queue-state', item.queueState?.label || 'Open', item.queueState?.tone),
        renderBadge('mode', item.modeLabel, 'neutral'),
        item.resultFeedback
          ? renderBadge('result', item.resultFeedback.label, item.status === 'completed' ? 'success' : 'warning')
          : null,
      ]),
    ]),
    h('p', {
      key: 'meta',
      className: 'mt-3 text-sm text-slate-600',
    }, `Due ${item.dueAtLabel} · ${item.estimatedMinutesLabel}`),
    item.resultFeedback?.summary
      ? h('div', {
        key: 'result-summary',
        className: 'mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800',
      }, item.resultFeedback.summary)
      : null,
    h(ReviewTaskActionBar, {
      key: 'actions',
      item,
      draft: drafts[item.reviewTaskId] || {},
      mutationState: mutationStateByTaskId[item.reviewTaskId] || {},
      onDraftChange,
      onLaunch,
      onComplete,
      onReschedule,
      onOpenWorkspace,
    }),
  ]);
}

export default function ReviewQueuePanel({
  drafts = {},
  mutationStateByTaskId = {},
  onComplete = () => {},
  onDraftChange = () => {},
  onLaunch = () => {},
  onOpenGlobalQueue = null,
  onOpenWorkspace = null,
  onReschedule = () => {},
  reviewQueue,
}) {
  const items = Array.isArray(reviewQueue?.items) ? reviewQueue.items : [];
  const summary = reviewQueue?.summary || {};

  return h('section', {
    className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
  }, [
    h('div', {
      key: 'header',
      className: 'flex flex-wrap items-start justify-between gap-4',
    }, [
      h('div', { key: 'copy' }, [
        h('h2', {
          key: 'title',
          className: 'text-xl font-semibold tracking-tight text-slate-950',
        }, 'Review queue'),
        h('p', {
          key: 'body',
          className: 'mt-2 text-sm leading-6 text-slate-600',
        }, 'Topic workspaces read the filtered projection while the global review queue remains canonical.'),
      ]),
      typeof onOpenGlobalQueue === 'function'
        ? h('button', {
          key: 'open-global',
          type: 'button',
          onClick: () => onOpenGlobalQueue(),
          className: 'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900',
        }, 'Open canonical queue')
        : null,
    ].filter(Boolean)),
    h('div', {
      key: 'summary',
      className: 'mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5',
    }, [
      renderSummaryChip('due', 'Due', summary.due ?? 0),
      renderSummaryChip('deferred', 'Deferred', summary.deferred ?? 0),
      renderSummaryChip('open', 'Open', summary.open ?? 0),
      renderSummaryChip('completed', 'Completed', summary.completed ?? 0),
      renderSummaryChip('blocked', 'Blocked', summary.blocked ?? 0),
    ]),
    items.length
      ? h('ul', {
        key: 'items',
        className: 'mt-5 space-y-4',
      }, items.map((item) => renderReviewItem(item, {
        drafts,
        mutationStateByTaskId,
        onDraftChange,
        onLaunch,
        onComplete,
        onReschedule,
        onOpenWorkspace,
      })))
      : h('p', {
        key: 'empty',
        className: 'mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600',
      }, 'No review tasks are projected for this topic.'),
  ]);
}
