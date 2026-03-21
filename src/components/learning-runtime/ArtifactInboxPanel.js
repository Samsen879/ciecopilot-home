import React from 'react';

const h = React.createElement;

function renderMetric(label, value) {
  return h('div', {
    key: label,
    className: 'rounded-2xl border border-slate-200 bg-slate-50 p-4',
  }, [
    h('dt', {
      key: 'label',
      className: 'text-sm font-medium text-slate-500',
    }, label),
    h('dd', {
      key: 'value',
      className: 'mt-2 text-lg font-semibold text-slate-950',
    }, String(value ?? 0)),
  ]);
}

export default function ArtifactInboxPanel({ artifactInbox }) {
  const metrics = [
    ['Pinned stable slots', artifactInbox?.pinnedSlotCount ?? 0],
    ['Open stable slots', artifactInbox?.openSlotCount ?? 0],
    ['Linked references in workspace', artifactInbox?.totalLinkedReferences ?? 0],
  ];

  return h('section', {
    className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
  }, [
    h('h2', {
      key: 'title',
      className: 'text-xl font-semibold tracking-tight text-slate-950',
    }, 'Artifact inbox'),
    h('p', {
      key: 'body',
      className: 'mt-2 text-sm leading-6 text-slate-600',
    }, 'This compatibility shell keeps inbox state separate from stable-slot truth and only surfaces the current projection summary.'),
    h('dl', {
      key: 'metrics',
      className: 'mt-5 grid gap-3 sm:grid-cols-3',
    }, metrics.map(([label, value]) => renderMetric(label, value))),
    h('p', {
      key: 'empty',
      className: 'mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600',
    }, 'No inbox artifacts in this workspace projection.'),
  ]);
}
