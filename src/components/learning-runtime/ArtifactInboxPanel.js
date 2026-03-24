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
    ['Canonical residents', artifactInbox?.populatedSlotCount ?? 0],
    ['Empty stable slots', artifactInbox?.emptySlotCount ?? 0],
    ['Stale projections', artifactInbox?.staleSlotCount ?? 0],
    ['Missing content', artifactInbox?.missingContentCount ?? 0],
    ['Linked references', artifactInbox?.totalLinkedReferences ?? 0],
  ];
  const hasCoverage = metrics.some(([, value]) => Number(value) > 0);

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
    }, 'Read-only workspace coverage summary. Slot launch actions live above; artifact lifecycle writes stay out of this issue.'),
    h('dl', {
      key: 'metrics',
      className: 'mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5',
    }, metrics.map(([label, value]) => renderMetric(label, value))),
    h('p', {
      key: 'note',
      className: 'mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600',
    }, hasCoverage
      ? 'Canonical-home coverage is projected here for visibility only; pin, contest, and supersede actions land in later issues.'
      : 'No canonical slot coverage is projected for this workspace yet.'),
  ]);
}
