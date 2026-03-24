import React from 'react';

const h = React.createElement;

function baseFieldProps(disabled) {
  return {
    disabled,
    className:
      'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100',
  };
}

function buttonClassName({ tone = 'secondary' } = {}) {
  if (tone === 'primary') {
    return 'rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300';
  }

  if (tone === 'success') {
    return 'rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:border-emerald-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400';
  }

  return 'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400';
}

function renderButton({
  key,
  label,
  dataAction,
  onClick,
  disabled = false,
  tone = 'secondary',
}) {
  return h('button', {
    key,
    type: 'button',
    disabled,
    onClick,
    'data-action': dataAction,
    className: buttonClassName({ tone }),
  }, label);
}

export default function ReviewTaskActionBar({
  draft = {},
  item = {},
  mutationState = {},
  onComplete = () => {},
  onDraftChange = () => {},
  onLaunch = () => {},
  onOpenWorkspace = null,
  onReschedule = () => {},
}) {
  const completionSummary = draft.completionSummary || '';
  const dueAt = draft.dueAt || '';
  const pendingIntent = mutationState.pendingIntent || null;
  const isMutating = Boolean(pendingIntent);
  const canLaunch = Boolean(item.canLaunch && item.launchPayload) && !isMutating;
  const canComplete = Boolean(item.canComplete && completionSummary.trim()) && !isMutating;
  const canReschedule = Boolean(item.canReschedule && dueAt) && !isMutating;
  const canOpenWorkspace = typeof onOpenWorkspace === 'function' && item.workspaceLink?.topicId;

  return h('div', {
    className: 'mt-4 grid gap-4 border-t border-slate-200 pt-4',
  }, [
    h('div', {
      key: 'primary-actions',
      className: 'flex flex-wrap gap-2',
    }, [
      renderButton({
        key: 'launch',
        label: pendingIntent === 'launch' ? 'Launching...' : 'Start spaced review',
        dataAction: 'launch-review',
        disabled: !canLaunch,
        tone: 'primary',
        onClick: () => onLaunch(item.launchPayload),
      }),
      canOpenWorkspace
        ? renderButton({
          key: 'workspace',
          label: 'Open workspace',
          dataAction: 'open-workspace',
          disabled: isMutating,
          onClick: () => onOpenWorkspace(item.workspaceLink),
        })
        : null,
    ].filter(Boolean)),
    h('label', {
      key: 'completion-summary',
      className: 'grid gap-2 text-sm text-slate-700',
    }, [
      h('span', {
        key: 'label',
        className: 'font-medium text-slate-900',
      }, 'Completion note'),
      h('textarea', {
        ...baseFieldProps(isMutating),
        key: 'field',
        rows: 3,
        name: 'completionSummary',
        value: completionSummary,
        onChange: (event) => onDraftChange(item.reviewTaskId, {
          completionSummary: event.target.value,
        }),
      }),
      h('span', {
        key: 'hint',
        className: 'text-xs leading-5 text-slate-500',
      }, 'Required for runtime completion writes so the result stays visible in canonical queue truth.'),
    ]),
    h('div', {
      key: 'completion-actions',
      className: 'flex flex-wrap gap-2',
    }, [
      renderButton({
        key: 'complete',
        label: pendingIntent === 'complete' ? 'Saving...' : 'Mark complete',
        dataAction: 'complete-review',
        disabled: !canComplete,
        tone: 'success',
        onClick: () => onComplete({
          reviewTaskId: item.reviewTaskId,
          completionOutcome: 'completed',
          completionSummary,
        }),
      }),
      renderButton({
        key: 'partial',
        label: pendingIntent === 'partial' ? 'Saving...' : 'Record partial',
        dataAction: 'partial-review',
        disabled: !canComplete,
        onClick: () => onComplete({
          reviewTaskId: item.reviewTaskId,
          completionOutcome: 'partial',
          completionSummary,
        }),
      }),
    ]),
    h('label', {
      key: 'reschedule',
      className: 'grid gap-2 text-sm text-slate-700',
    }, [
      h('span', {
        key: 'label',
        className: 'font-medium text-slate-900',
      }, 'Reschedule due time'),
      h('input', {
        ...baseFieldProps(isMutating),
        key: 'field',
        type: 'datetime-local',
        name: 'dueAt',
        value: dueAt,
        onChange: (event) => onDraftChange(item.reviewTaskId, {
          dueAt: event.target.value,
        }),
      }),
    ]),
    h('div', {
      key: 'reschedule-actions',
      className: 'flex flex-wrap gap-2',
    }, [
      renderButton({
        key: 'reschedule',
        label: pendingIntent === 'reschedule' ? 'Saving...' : 'Reschedule',
        dataAction: 'reschedule-review',
        disabled: !canReschedule,
        onClick: () => onReschedule({
          reviewTaskId: item.reviewTaskId,
          dueAt,
        }),
      }),
    ]),
    mutationState.errorMessage
      ? h('div', {
        key: 'error',
        className: 'rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700',
      }, mutationState.errorMessage)
      : null,
    mutationState.feedbackMessage
      ? h('div', {
        key: 'feedback',
        className: 'rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800',
      }, mutationState.feedbackMessage)
      : null,
  ].filter(Boolean));
}
