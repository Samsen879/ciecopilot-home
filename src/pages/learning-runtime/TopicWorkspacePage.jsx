import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getWorkspace,
  updateReviewTask,
} from '../../api/learningRuntimeApi.js';
import WorkspaceShell from '../../components/learning-runtime/WorkspaceShell.js';
import { buildReviewQueueActionDrafts } from '../../components/learning-runtime/view-models/review-queue-view-model.js';
import { buildWorkspaceViewModel } from '../../components/learning-runtime/view-models/workspace-view-model.js';
import {
  LEARNING_RUNTIME_REVIEW_QUEUE_ROUTE_PATH,
  LEARNING_RUNTIME_ROUTE_PATHS,
} from '../legacy-entry-mode.js';

const LEARNING_SESSION_LAUNCH_PATH = LEARNING_RUNTIME_ROUTE_PATHS[0].replace(':sessionId', 'new');

function pruneTaskState(items, currentState = {}) {
  const nextState = {};

  (Array.isArray(items) ? items : []).forEach((item) => {
    if (item?.reviewTaskId && currentState[item.reviewTaskId]) {
      nextState[item.reviewTaskId] = currentState[item.reviewTaskId];
    }
  });

  return nextState;
}

function toIsoTimestamp(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

export default function TopicWorkspacePage() {
  const { topicId = '' } = useParams();
  const navigate = useNavigate();
  const [viewModel, setViewModel] = useState(null);
  const [surfaceState, setSurfaceState] = useState('loading');
  const [error, setError] = useState(null);
  const [reviewQueueDrafts, setReviewQueueDrafts] = useState({});
  const [reviewQueueMutationStateByTaskId, setReviewQueueMutationStateByTaskId] = useState({});

  function applyWorkspacePayload(payload) {
    const nextViewModel = buildWorkspaceViewModel(payload);
    const reviewQueueItems = nextViewModel?.reviewQueue?.items || [];

    setViewModel(nextViewModel);
    setReviewQueueDrafts((currentDrafts) => buildReviewQueueActionDrafts(
      reviewQueueItems,
      currentDrafts,
    ));
    setReviewQueueMutationStateByTaskId((currentState) => pruneTaskState(
      reviewQueueItems,
      currentState,
    ));
  }

  async function loadWorkspacePayload(active = true) {
    if (!topicId) {
      if (!active) {
        return;
      }

      setSurfaceState('error');
      setError(new Error('topicId is required'));
      return;
    }

    setSurfaceState('loading');
    setError(null);

    try {
      const payload = await getWorkspace(topicId);
      if (!active) {
        return;
      }

      applyWorkspacePayload(payload);
      setSurfaceState('ready');
    } catch (loadError) {
      if (!active) {
        return;
      }

      setError(loadError);
      setSurfaceState('error');
    }
  }

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      await loadWorkspacePayload(active);
    }

    loadWorkspace();

    return () => {
      active = false;
    };
  }, [topicId]);

  function handleLaunch(launchPayload) {
    if (!launchPayload) {
      return;
    }

    navigate(LEARNING_SESSION_LAUNCH_PATH, {
      state: {
        launchPayload,
      },
    });
  }

  function patchReviewQueueMutationState(reviewTaskId, patch) {
    setReviewQueueMutationStateByTaskId((currentState) => ({
      ...currentState,
      [reviewTaskId]: {
        ...(currentState[reviewTaskId] || {}),
        ...patch,
      },
    }));
  }

  function handleReviewQueueDraftChange(reviewTaskId, patch) {
    setReviewQueueDrafts((currentDrafts) => ({
      ...currentDrafts,
      [reviewTaskId]: {
        ...(currentDrafts[reviewTaskId] || {}),
        ...patch,
      },
    }));
    patchReviewQueueMutationState(reviewTaskId, {
      errorMessage: null,
      feedbackMessage: null,
    });
  }

  async function handleCompleteReviewTask({
    reviewTaskId,
    completionOutcome,
    completionSummary,
  }) {
    patchReviewQueueMutationState(reviewTaskId, {
      pendingIntent: completionOutcome,
      errorMessage: null,
      feedbackMessage: null,
    });

    try {
      await updateReviewTask(reviewTaskId, {
        intent: 'complete',
        completionOutcome,
        completionEvidence: {
          summary: completionSummary.trim(),
        },
      });
      const payload = await getWorkspace(topicId);
      applyWorkspacePayload(payload);
      patchReviewQueueMutationState(reviewTaskId, {
        pendingIntent: null,
        errorMessage: null,
        feedbackMessage: completionOutcome === 'partial'
          ? 'Partial result recorded. Reschedule if the repair still needs another pass.'
          : 'Review task completed.',
      });
      setReviewQueueDrafts((currentDrafts) => ({
        ...currentDrafts,
        [reviewTaskId]: {
          ...(currentDrafts[reviewTaskId] || {}),
          completionSummary: '',
        },
      }));
    } catch (requestError) {
      patchReviewQueueMutationState(reviewTaskId, {
        pendingIntent: null,
        errorMessage: requestError?.message || 'Failed to update the review task.',
      });
    }
  }

  async function handleRescheduleReviewTask({ reviewTaskId, dueAt }) {
    patchReviewQueueMutationState(reviewTaskId, {
      pendingIntent: 'reschedule',
      errorMessage: null,
      feedbackMessage: null,
    });

    try {
      await updateReviewTask(reviewTaskId, {
        intent: 'reschedule',
        dueAt: toIsoTimestamp(dueAt),
      });
      const payload = await getWorkspace(topicId);
      applyWorkspacePayload(payload);
      patchReviewQueueMutationState(reviewTaskId, {
        pendingIntent: null,
        errorMessage: null,
        feedbackMessage: `Rescheduled for ${toIsoTimestamp(dueAt)}.`,
      });
    } catch (requestError) {
      patchReviewQueueMutationState(reviewTaskId, {
        pendingIntent: null,
        errorMessage: requestError?.message || 'Failed to reschedule the review task.',
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full border border-slate-300 bg-white p-3 text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
              Learning Runtime
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              Topic workspace
            </h1>
            <p className="mt-2 text-base leading-7 text-slate-600">
              Workspace projections keep canonical slot residency, linked references, and the
              topic-filtered review queue separate.
            </p>
          </div>
        </div>

        {surfaceState === 'loading' ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-sm text-slate-600 shadow-sm">
            Loading workspace...
          </div>
        ) : null}

        {surfaceState === 'error' ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-sm text-rose-700 shadow-sm">
            {error?.message || 'Failed to load workspace.'}
          </div>
        ) : null}

        {surfaceState === 'ready' && viewModel ? (
          <WorkspaceShell
            viewModel={viewModel}
            onLaunch={handleLaunch}
            onOpenGlobalQueue={() => navigate(LEARNING_RUNTIME_REVIEW_QUEUE_ROUTE_PATH)}
            reviewQueueDrafts={reviewQueueDrafts}
            reviewQueueMutationStateByTaskId={reviewQueueMutationStateByTaskId}
            onReviewQueueDraftChange={handleReviewQueueDraftChange}
            onCompleteReviewTask={handleCompleteReviewTask}
            onRescheduleReviewTask={handleRescheduleReviewTask}
          />
        ) : null}
      </div>
    </div>
  );
}
