import React from 'react';
import ArtifactLifecycleActions from './ArtifactLifecycleActions.js';
import WorkspaceArtifactCard from './WorkspaceArtifactCard.js';

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

export default function ArtifactInboxPanel({
  artifactInbox,
  onLaunch,
  onMarkContested,
  onPin,
  onSupersede,
  onUnpin,
  pendingArtifactId = null,
  pendingIntent = null,
}) {
  const metrics = [
    ['Canonical residents', artifactInbox?.populatedSlotCount ?? 0],
    ['Empty stable slots', artifactInbox?.emptySlotCount ?? 0],
    ['Stale projections', artifactInbox?.staleSlotCount ?? 0],
    ['Missing content', artifactInbox?.missingContentCount ?? 0],
    ['Linked references', artifactInbox?.totalLinkedReferences ?? 0],
  ];
  const hasCoverage = metrics.some(([, value]) => Number(value) > 0);
  const items = Array.isArray(artifactInbox?.items) ? artifactInbox.items : [];

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
    }, 'Visible inbox artifacts can be pinned, contested, or chosen as supersede successors without leaving the workspace.'),
    h('dl', {
      key: 'metrics',
      className: 'mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5',
    }, metrics.map(([label, value]) => renderMetric(label, value))),
    items.length
      ? h('div', {
        key: 'items',
        className: 'mt-5 space-y-4',
      }, [
        h('p', {
          key: 'label',
          className: 'text-sm font-medium text-slate-500',
        }, 'Visible inbox artifacts'),
        h('div', {
          key: 'cards',
          className: 'grid gap-4',
        }, items.map((card) => h('div', {
          key: card.artifactId,
          className: 'rounded-2xl border border-slate-200 bg-slate-50 p-4',
        }, [
          h(WorkspaceArtifactCard, {
            key: 'card',
            card,
            onLaunch,
          }),
          h(ArtifactLifecycleActions, {
            key: 'actions',
            artifact: card,
            pendingAction: pendingArtifactId === card.artifactId ? pendingIntent : null,
            onMarkContested,
            onPin,
            onSupersede,
            onUnpin,
          }),
        ]))),
      ])
      : h('p', {
        key: 'empty-items',
        className: 'mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600',
      }, 'No visible inbox artifacts are projected for this workspace yet.'),
    h('p', {
      key: 'note',
      className: 'mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600',
    }, hasCoverage
      ? 'Canonical-home and slot-compatibility rules stay conservative here: only visible, compatible inbox artifacts expose pin actions.'
      : 'No canonical slot coverage is projected for this workspace yet.'),
  ]);
}
