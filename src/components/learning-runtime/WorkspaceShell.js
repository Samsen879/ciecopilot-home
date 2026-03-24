import React from 'react';
import ArtifactInboxPanel from './ArtifactInboxPanel.js';
import ReviewQueuePanel from './ReviewQueuePanel.js';
import StableSlotPanel from './StableSlotPanel.js';

const h = React.createElement;

function renderWorkspaceHeader(workspace) {
  return h('section', {
    key: 'header',
    className: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
  }, [
    h('p', {
      key: 'eyebrow',
      className: 'text-sm font-medium uppercase tracking-[0.24em] text-slate-500',
    }, 'Topic workspace'),
    h('h1', {
      key: 'title',
      className: 'mt-3 text-3xl font-semibold tracking-tight text-slate-950',
    }, workspace?.topicPath || 'Workspace'),
    h('p', {
      key: 'body',
      className: 'mt-3 text-sm leading-6 text-slate-600',
    }, 'Canonical slot artifacts stay separate from linked references and the topic-filtered review queue.'),
  ]);
}

export default function WorkspaceShell({ onLaunch, viewModel }) {
  const slotList = Array.isArray(viewModel?.slotList) ? viewModel.slotList : [];

  return h('div', { className: 'grid gap-6' }, [
    renderWorkspaceHeader(viewModel?.workspace || {}),
    h('section', { key: 'slots', className: 'grid gap-4 lg:grid-cols-2' }, slotList.map((slot) => h(
      StableSlotPanel,
      {
        key: slot.slotKey,
        onLaunch,
        slot,
      },
    ))),
    h('div', { key: 'secondary', className: 'grid gap-4 lg:grid-cols-2' }, [
      h(ArtifactInboxPanel, {
        key: 'artifact-inbox',
        artifactInbox: viewModel?.artifactInbox || {},
      }),
      h(ReviewQueuePanel, {
        key: 'review-queue',
        reviewQueue: viewModel?.reviewQueue || {},
      }),
    ]),
  ]);
}
