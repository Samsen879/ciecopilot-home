import React from 'react';

const h = React.createElement;

export default function ArtifactSupersedeSheet({
  artifact,
  candidates = [],
  errorMessage = null,
  manualArtifactId = '',
  onCancel,
  onConfirm,
  onManualArtifactIdChange,
  onSelectCandidate,
  pending = false,
  selectedArtifactId = '',
}) {
  if (!artifact) {
    return null;
  }

  return h('section', {
    className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
  }, [
    h('div', {
      key: 'header',
      className: 'flex items-start justify-between gap-4',
    }, [
      h('div', { key: 'copy' }, [
        h('p', {
          key: 'eyebrow',
          className: 'text-sm font-medium uppercase tracking-[0.24em] text-slate-500',
        }, 'Supersede artifact'),
        h('h2', {
          key: 'title',
          className: 'mt-2 text-xl font-semibold tracking-tight text-slate-950',
        }, artifact.title || artifact.artifactId),
        h('p', {
          key: 'body',
          className: 'mt-2 text-sm leading-6 text-slate-600',
        }, 'Choose a visible successor or enter an artifact ID from the same canonical-home slot. Conflicts are rejected explicitly by the runtime contract.'),
      ]),
      h('button', {
        key: 'close',
        type: 'button',
        onClick: () => onCancel?.(),
        className: 'rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900',
      }, 'Close'),
    ]),
    candidates.length
      ? h('div', {
        key: 'candidates',
        className: 'mt-5 space-y-2',
      }, candidates.map((candidate) => h('label', {
        key: candidate.artifactId,
        className: 'flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700',
      }, [
        h('input', {
          key: 'radio',
          type: 'radio',
          name: 'artifact-successor',
          checked: selectedArtifactId === candidate.artifactId,
          onChange: () => onSelectCandidate?.(candidate.artifactId),
        }),
        h('div', { key: 'copy' }, [
          h('p', {
            key: 'title',
            className: 'font-semibold text-slate-900',
          }, candidate.title || candidate.artifactId),
          candidate.description
            ? h('p', {
              key: 'description',
              className: 'mt-1 text-sm text-slate-600',
            }, candidate.description)
            : null,
        ].filter(Boolean)),
      ])))
      : h('p', {
        key: 'empty',
        className: 'mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600',
      }, 'No visible successor candidates are projected for this slot yet.'),
    h('label', {
      key: 'manual',
      className: 'mt-5 block text-sm text-slate-700',
    }, [
      h('span', {
        key: 'label',
        className: 'font-medium text-slate-900',
      }, 'Manual successor artifact ID'),
      h('input', {
        key: 'input',
        type: 'text',
        value: manualArtifactId,
        onChange: (event) => onManualArtifactIdChange?.(event.target.value),
        placeholder: 'artifact-successor-id',
        className: 'mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none',
      }),
    ]),
    errorMessage
      ? h('p', {
        key: 'error',
        className: 'mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700',
      }, errorMessage)
      : null,
    h('div', {
      key: 'footer',
      className: 'mt-5 flex flex-wrap gap-2',
    }, [
      h('button', {
        key: 'confirm',
        type: 'button',
        onClick: () => onConfirm?.(),
        disabled: pending,
        className: 'rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60',
      }, pending ? 'Superseding...' : 'Confirm supersede'),
      h('button', {
        key: 'cancel',
        type: 'button',
        onClick: () => onCancel?.(),
        className: 'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900',
      }, 'Cancel'),
    ]),
  ]);
}
