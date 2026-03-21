import React from 'react';

const h = React.createElement;

function renderLinkedReferences(linkedReferences = []) {
  if (!linkedReferences.length) {
    return h('p', {
      key: 'linked-list',
      className: 'mt-2 text-sm text-slate-500',
    }, 'No linked references for this slot.');
  }

  return h('ul', {
    key: 'linked-list',
    className: 'mt-3 space-y-2 text-sm text-slate-700',
  }, linkedReferences.map((reference) => h(
    'li',
    {
      key: `${reference.kind}:${reference.label}`,
      className: 'rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2',
    },
    reference.label,
  )));
}

export default function StableSlotPanel({ slot }) {
  return h('section', {
    className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
  }, [
    h('div', { key: 'header' }, [
      h('h2', {
        key: 'title',
        className: 'text-xl font-semibold tracking-tight text-slate-950',
      }, slot?.title || 'Workspace slot'),
      h('p', {
        key: 'description',
        className: 'mt-2 text-sm leading-6 text-slate-600',
      }, slot?.description || 'Stable slot projection'),
    ]),
    h('div', {
      key: 'primary',
      className: 'mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4',
    }, [
      h('p', {
        key: 'label',
        className: 'text-sm font-medium text-slate-500',
      }, 'Pinned artifact'),
      h('p', {
        key: 'value',
        className: 'mt-2 text-base font-semibold text-slate-900',
      }, slot?.primaryArtifact?.label || 'No canonical artifact pinned.'),
    ]),
    h('div', { key: 'linked', className: 'mt-5' }, [
      h('p', {
        key: 'label',
        className: 'text-sm font-medium text-slate-500',
      }, 'Linked references'),
      renderLinkedReferences(slot?.linkedReferences || []),
    ]),
  ]);
}
