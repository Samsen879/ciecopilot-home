import React from 'react';
import LinkedReferenceList from './LinkedReferenceList.js';
import WorkspaceArtifactCard from './WorkspaceArtifactCard.js';

const h = React.createElement;

function toneClassName(tone) {
  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function renderSurfaceState(surfaceState) {
  if (!surfaceState || !surfaceState.message) {
    return null;
  }

  return h('section', {
    key: 'surface-state',
    className: `mt-5 rounded-2xl border px-4 py-3 text-sm ${toneClassName(surfaceState.tone)}`,
  }, [
    h('p', {
      key: 'label',
      className: 'font-semibold',
    }, surfaceState.label),
    h('p', {
      key: 'message',
      className: 'mt-1 leading-6',
    }, surfaceState.message),
  ]);
}

function renderEmptyState(slot) {
  if (!slot?.emptyState) {
    return null;
  }

  return h('div', {
    className: 'mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4',
  }, [
    h('p', {
      key: 'label',
      className: 'text-sm font-semibold text-slate-900',
    }, slot.emptyState.label),
    h('p', {
      key: 'message',
      className: 'mt-2 text-sm leading-6 text-slate-600',
    }, slot.emptyState.message),
  ]);
}

export default function StableSlotPanel({ onLaunch, slot }) {
  const slotLaunch = slot?.slotLaunch || null;

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
        }, slot?.title || 'Workspace slot'),
        slot?.updatedAtLabel
          ? h('p', {
            key: 'updated-at',
            className: 'mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500',
          }, slot.updatedAtLabel)
          : null,
        h('p', {
          key: 'description',
          className: 'mt-2 text-sm leading-6 text-slate-600',
        }, slot?.description || 'Stable slot projection'),
      ].filter(Boolean)),
      slotLaunch
        ? h('button', {
          key: 'slot-launch',
          type: 'button',
          onClick: () => onLaunch?.(slotLaunch.launchPayload),
          className: 'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900',
        }, slotLaunch.ctaLabel || 'Open slot')
        : null,
    ].filter(Boolean)),
    renderSurfaceState(slot?.surfaceState),
    slot?.primaryArtifactCard
      ? h(WorkspaceArtifactCard, {
        key: 'primary-card',
        card: slot.primaryArtifactCard,
        onLaunch,
      })
      : h('div', {
        key: 'empty-card',
      }, renderEmptyState(slot)),
    h('div', { key: 'linked', className: 'mt-5' }, [
      h('p', {
        key: 'label',
        className: 'text-sm font-medium text-slate-500',
      }, 'Linked references'),
      h(LinkedReferenceList, {
        key: 'linked-list',
        cards: slot?.linkedReferenceCards || [],
        onLaunch,
      }),
    ]),
  ]);
}
