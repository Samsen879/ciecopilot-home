import React from 'react';

const h = React.createElement;

function toneClassName(tone) {
  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }

  return 'border-slate-200 bg-white text-slate-700';
}

export default function WorkspaceArtifactCard({ card, onLaunch }) {
  if (!card) {
    return null;
  }

  const launch = card.launch || null;
  const state = card.state || null;
  const meta = [card.kindLabel, card.updatedAtLabel].filter(Boolean).join(' · ');

  return h('article', {
    className: 'rounded-2xl border border-slate-200 bg-slate-50 p-4',
  }, [
    h('div', {
      key: 'header',
      className: 'flex flex-wrap items-start justify-between gap-3',
    }, [
      h('div', { key: 'copy' }, [
        h('p', {
          key: 'placement',
          className: 'text-xs font-semibold uppercase tracking-[0.2em] text-slate-500',
        }, card.placementLabel || 'Workspace card'),
        h('h3', {
          key: 'title',
          className: 'mt-2 text-base font-semibold text-slate-950',
        }, card.title || 'Untitled workspace content'),
        meta
          ? h('p', {
            key: 'meta',
            className: 'mt-1 text-sm text-slate-600',
          }, meta)
          : null,
      ].filter(Boolean)),
      launch
        ? h('button', {
          key: 'launch',
          type: 'button',
          onClick: () => onLaunch?.(launch.launchPayload),
          className: 'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900',
        }, launch.ctaLabel || 'Launch')
        : null,
    ].filter(Boolean)),
    card.description
      ? h('p', {
        key: 'description',
        className: 'mt-3 text-sm leading-6 text-slate-600',
      }, card.description)
      : null,
    state
      ? h('div', {
        key: 'state',
        className: `mt-4 rounded-2xl border px-4 py-3 text-sm ${toneClassName(state.tone)}`,
      }, [
        h('p', {
          key: 'label',
          className: 'font-semibold',
        }, state.label),
        state.message
          ? h('p', {
            key: 'message',
            className: 'mt-1 leading-6',
          }, state.message)
          : null,
      ].filter(Boolean))
      : null,
  ].filter(Boolean));
}
