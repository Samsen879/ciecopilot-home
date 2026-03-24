import React from 'react';

const h = React.createElement;

function renderActionButton({
  actionKey,
  ctaLabel,
  onClick,
  pendingAction,
}) {
  return h('button', {
    key: actionKey,
    type: 'button',
    onClick,
    disabled: Boolean(pendingAction),
    className: 'rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60',
  }, pendingAction === actionKey ? `${ctaLabel}...` : ctaLabel);
}

export default function ArtifactLifecycleActions({
  artifact,
  pendingAction = null,
  onMarkContested,
  onPin,
  onSupersede,
  onUnpin,
}) {
  const availableActions = artifact?.availableActions || {};
  const notes = [
    availableActions.pinBlockedReason,
    availableActions.contestedBlockedReason,
  ].filter(Boolean);

  if (
    !availableActions.canPin
    && !availableActions.canUnpin
    && !availableActions.canMarkContested
    && !availableActions.canSupersede
    && !notes.length
  ) {
    return null;
  }

  return h('div', {
    className: 'mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3',
  }, [
    h('div', {
      key: 'buttons',
      className: 'flex flex-wrap gap-2',
    }, [
      availableActions.canPin
        ? renderActionButton({
          actionKey: 'pin',
          ctaLabel: 'Pin to slot',
          onClick: () => onPin?.(artifact),
          pendingAction,
        })
        : null,
      availableActions.canUnpin
        ? renderActionButton({
          actionKey: 'unpin',
          ctaLabel: 'Unpin',
          onClick: () => onUnpin?.(artifact),
          pendingAction,
        })
        : null,
      availableActions.canMarkContested
        ? renderActionButton({
          actionKey: 'mark_contested',
          ctaLabel: 'Mark contested',
          onClick: () => onMarkContested?.(artifact),
          pendingAction,
        })
        : null,
      availableActions.canSupersede
        ? renderActionButton({
          actionKey: 'attach_superseded_by',
          ctaLabel: 'Supersede',
          onClick: () => onSupersede?.(artifact),
          pendingAction,
        })
        : null,
    ].filter(Boolean)),
    notes.length
      ? h('div', {
        key: 'notes',
        className: 'mt-3 space-y-1 text-sm text-slate-600',
      }, notes.map((note) => h('p', { key: note }, note)))
      : null,
  ].filter(Boolean));
}
