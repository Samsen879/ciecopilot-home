import React from 'react';
import WorkspaceArtifactCard from './WorkspaceArtifactCard.js';

const h = React.createElement;

export default function LinkedReferenceList({
  cards = [],
  emptyMessage = 'No linked references for this slot.',
  onLaunch,
}) {
  if (!cards.length) {
    return h('p', {
      className: 'mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600',
    }, emptyMessage);
  }

  return h('div', {
    className: 'mt-3 grid gap-3',
  }, cards.map((card, index) => h(WorkspaceArtifactCard, {
    key: `${card.title || 'linked-reference'}-${index + 1}`,
    card,
    onLaunch,
  })));
}
