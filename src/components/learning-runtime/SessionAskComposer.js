import React from 'react';

const h = React.createElement;

export default function SessionAskComposer({
  composer,
  onChange = () => {},
  onSubmit = () => {},
}) {
  const isSubmitting = composer?.status === 'submitting';
  const canSubmit = Boolean(composer?.canSubmit) && !isSubmitting;

  return h('section', { className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm' }, [
    h('div', { key: 'heading' }, [
      h('p', {
        key: 'eyebrow',
        className: 'text-xs font-semibold uppercase tracking-[0.24em] text-slate-500',
      }, 'Follow-up'),
      h('h2', {
        key: 'title',
        className: 'mt-3 text-2xl font-semibold tracking-tight text-slate-950',
      }, 'Ask inside this session'),
      h('p', {
        key: 'body',
        className: 'mt-2 text-sm leading-6 text-slate-600',
      }, 'Submit the next turn inside the live runtime session and update the timeline from the ask response.'),
    ]),
    h('form', {
      key: 'form',
      className: 'mt-6 grid gap-4',
      onSubmit: (event) => {
        event.preventDefault();
        if (!canSubmit) {
          return;
        }
        onSubmit();
      },
    }, [
      h('label', { key: 'message-field', className: 'grid gap-2 text-sm text-slate-700' }, [
        h('span', { key: 'label', className: 'font-medium text-slate-900' }, 'Message'),
        h('textarea', {
          key: 'textarea',
          rows: 4,
          value: composer?.message || '',
          onChange: (event) => onChange(event.target.value),
          className:
            'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900',
          disabled: isSubmitting,
        }),
      ]),
      composer?.errorMessage
        ? h('div', {
          key: 'error',
          className: 'rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700',
        }, composer.errorMessage)
        : null,
      h('div', { key: 'actions', className: 'flex items-center justify-end' }, [
        h('button', {
          key: 'submit',
          type: 'submit',
          disabled: !canSubmit,
          className: 'rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300',
        }, isSubmitting ? 'Sending follow-up...' : 'Send follow-up'),
      ]),
    ].filter(Boolean)),
  ]);
}
