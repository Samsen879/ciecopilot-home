import React from 'react';

const h = React.createElement;

function renderReviewItem(item) {
  return h('li', {
    key: item.reviewTaskId,
    className: 'rounded-2xl border border-slate-200 bg-slate-50 p-4',
  }, [
    h('div', {
      key: 'header',
      className: 'flex items-start justify-between gap-3',
    }, [
      h('div', { key: 'title-group' }, [
        h('p', {
          key: 'mode',
          className: 'text-sm font-semibold text-slate-900',
        }, item.modeLabel),
        h('p', {
          key: 'target',
          className: 'mt-1 text-sm text-slate-600',
        }, item.targetQuestionTypeTitle || item.targetTopicPath || item.reviewTaskId),
      ]),
      h('span', {
        key: 'status',
        className: 'rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500',
      }, item.statusLabel),
    ]),
    h('p', {
      key: 'meta',
      className: 'mt-3 text-sm text-slate-600',
    }, `Due ${item.dueAtLabel} · ${item.estimatedMinutesLabel}`),
  ]);
}

export default function ReviewQueuePanel({ reviewQueue }) {
  const items = Array.isArray(reviewQueue?.items) ? reviewQueue.items : [];

  return h('section', {
    className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
  }, [
    h('h2', {
      key: 'title',
      className: 'text-xl font-semibold tracking-tight text-slate-950',
    }, 'Review queue'),
    h('p', {
      key: 'body',
      className: 'mt-2 text-sm leading-6 text-slate-600',
    }, 'Topic workspaces read the filtered projection while the global review queue remains canonical.'),
    items.length
      ? h('ul', {
        key: 'items',
        className: 'mt-5 space-y-3',
      }, items.map((item) => renderReviewItem(item)))
      : h('p', {
        key: 'empty',
        className: 'mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600',
      }, 'No review tasks are projected for this topic.'),
  ]);
}
