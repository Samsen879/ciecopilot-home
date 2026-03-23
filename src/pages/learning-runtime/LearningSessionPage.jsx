import React, {
  startTransition,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  askInSession,
  createSession,
  getSession,
} from '../../api/learningRuntimeApi.js';
import LearningSessionShell from '../../components/learning-runtime/LearningSessionShell.jsx';
import { buildSessionViewModel } from '../../components/learning-runtime/view-models/session-view-model.js';
import {
  buildSessionLaunchPayload,
  createSessionLaunchDraft,
  mergeAskResponseIntoSessionPayload,
  patchSessionLaunchDraft,
  shouldApplyAskResponse,
  shouldApplyLaunchSuccess,
} from '../../components/learning-runtime/view-models/session-live-state.js';

const NEW_SESSION_SENTINEL = 'new';

function createRequestKey(prefix) {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}`;
}

export default function LearningSessionPage() {
  const { sessionId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isLauncherSurface = !sessionId || sessionId === NEW_SESSION_SENTINEL;
  const activeLaunchRequestKeyRef = useRef(null);
  const activeRouteSessionIdRef = useRef(isLauncherSurface ? null : sessionId);
  const isLauncherSurfaceRef = useRef(false);
  const isMountedRef = useRef(false);
  const sessionPayloadRef = useRef(null);
  const skipReloadSessionIdRef = useRef(null);
  const [sessionPayload, setSessionPayload] = useState(null);
  const [turnHistory, setTurnHistory] = useState([]);
  const [surfaceState, setSurfaceState] = useState('loading');
  const [error, setError] = useState(null);
  const [launchDraft, setLaunchDraft] = useState(() => createSessionLaunchDraft(
    location.state?.launchPayload || {},
  ));
  const [launchStatus, setLaunchStatus] = useState('idle');
  const [launchError, setLaunchError] = useState(null);
  const [askMessage, setAskMessage] = useState('');
  const [askStatus, setAskStatus] = useState('idle');
  const [askError, setAskError] = useState(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    activeRouteSessionIdRef.current = isLauncherSurface ? null : sessionId;
    isLauncherSurfaceRef.current = isLauncherSurface;
  }, [isLauncherSurface, sessionId]);

  useEffect(() => {
    sessionPayloadRef.current = sessionPayload;
  }, [sessionPayload]);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      if (isLauncherSurface) {
        if (!active) {
          return;
        }

        startTransition(() => {
          setSessionPayload(null);
          setTurnHistory([]);
          setAskMessage('');
          setAskStatus('idle');
          setAskError(null);
          setError(null);
          setSurfaceState('ready');
        });
        return;
      }

      if (skipReloadSessionIdRef.current === sessionId) {
        skipReloadSessionIdRef.current = null;
        if (!active) {
          return;
        }

        startTransition(() => {
          setSurfaceState('ready');
          setError(null);
        });
        return;
      }

      setSurfaceState('loading');
      setError(null);
      setLaunchStatus('idle');
      setLaunchError(null);
      setAskStatus('idle');
      setAskError(null);
      setAskMessage('');

      try {
        const payload = await getSession(sessionId);
        if (!active) {
          return;
        }

        startTransition(() => {
          setSessionPayload(payload);
          setTurnHistory([]);
          setAskError(null);
          setSurfaceState('ready');
        });
      } catch (loadError) {
        if (!active) {
          return;
        }

        startTransition(() => {
          setError(loadError);
          setSurfaceState('error');
        });
      }
    }

    loadSession();

    return () => {
      active = false;
    };
  }, [isLauncherSurface, sessionId]);

  useEffect(() => {
    if (!isLauncherSurface || !location.state?.launchPayload) {
      return;
    }

    setLaunchDraft(createSessionLaunchDraft(location.state.launchPayload));
  }, [isLauncherSurface, location.key, location.state]);

  async function handleLaunch() {
    if (launchStatus === 'submitting') {
      return;
    }

    setLaunchStatus('submitting');
    setLaunchError(null);
    const launchRequestKey = createRequestKey('launch-request');
    activeLaunchRequestKeyRef.current = launchRequestKey;

    try {
      const payload = await createSession(
        buildSessionLaunchPayload(launchDraft),
        {
          idempotencyKey: createRequestKey('learning-session'),
        },
      );
      const createdSessionId = payload?.session?.sessionId || null;
      const shouldApplyLaunch = shouldApplyLaunchSuccess({
        requestKey: launchRequestKey,
        activeRequestKey: activeLaunchRequestKeyRef.current,
        isLauncherSurface: isLauncherSurfaceRef.current,
        isMounted: isMountedRef.current,
      });
      if (!shouldApplyLaunch) {
        return;
      }

      startTransition(() => {
        setSessionPayload(payload);
        setTurnHistory([]);
        setAskMessage('');
        setAskError(null);
        setLaunchStatus('idle');
        setSurfaceState('ready');
        setError(null);
      });

      if (createdSessionId && shouldApplyLaunchSuccess({
        requestKey: launchRequestKey,
        activeRequestKey: activeLaunchRequestKeyRef.current,
        isLauncherSurface: isLauncherSurfaceRef.current,
        isMounted: isMountedRef.current,
      })) {
        skipReloadSessionIdRef.current = createdSessionId;
        navigate(`/learn/session/${createdSessionId}`, {
          replace: true,
          state: { justCreated: true },
        });
      }
    } catch (requestError) {
      const shouldApplyLaunch = shouldApplyLaunchSuccess({
        requestKey: launchRequestKey,
        activeRequestKey: activeLaunchRequestKeyRef.current,
        isLauncherSurface: isLauncherSurfaceRef.current,
        isMounted: isMountedRef.current,
      });
      if (!shouldApplyLaunch) {
        return;
      }

      startTransition(() => {
        setLaunchError(requestError);
        setLaunchStatus('idle');
      });
    }
  }

  function handleLaunchFieldChange(patch) {
    setLaunchError(null);
    setLaunchDraft((currentDraft) => patchSessionLaunchDraft(currentDraft, patch));
  }

  function handleAskMessageChange(nextMessage) {
    setAskError(null);
    setAskMessage(nextMessage);
  }

  async function handleAsk() {
    const activeSessionId = sessionPayload?.session?.sessionId || null;
    const trimmedMessage = askMessage.trim();

    if (!activeSessionId || !trimmedMessage || askStatus === 'submitting') {
      return;
    }

    setAskStatus('submitting');
    setAskError(null);

    const clientTurnId = createRequestKey('local-turn');

    try {
      const response = await askInSession(activeSessionId, {
        message: trimmedMessage,
        client_turn_id: clientTurnId,
      });
      const shouldApplyAsk = shouldApplyAskResponse({
        requestSessionId: activeSessionId,
        activeRouteSessionId: activeRouteSessionIdRef.current,
        currentSessionId: sessionPayloadRef.current?.session?.sessionId ?? null,
        isMounted: isMountedRef.current,
      });
      if (!shouldApplyAsk) {
        return;
      }

      startTransition(() => {
        setSessionPayload((currentPayload) => mergeAskResponseIntoSessionPayload(currentPayload, response));
        setTurnHistory((currentHistory) => currentHistory.concat({
          clientTurnId,
          userMessage: trimmedMessage,
          response,
        }));
        setAskMessage('');
        setAskStatus('idle');
      });
    } catch (requestError) {
      const shouldApplyAsk = shouldApplyAskResponse({
        requestSessionId: activeSessionId,
        activeRouteSessionId: activeRouteSessionIdRef.current,
        currentSessionId: sessionPayloadRef.current?.session?.sessionId ?? null,
        isMounted: isMountedRef.current,
      });
      if (!shouldApplyAsk) {
        return;
      }

      startTransition(() => {
        setAskError(requestError);
        setAskStatus('idle');
      });
    }
  }

  const viewModel = buildSessionViewModel(sessionPayload || {}, {
    turnHistory,
    launcher: {
      draft: launchDraft,
      status: launchStatus,
      error: launchError,
    },
    composer: {
      message: askMessage,
      status: askStatus,
      error: askError,
    },
  });

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
              {isLauncherSurface ? 'Launch session' : 'Session'}
            </h1>
            <p className="mt-2 text-base leading-7 text-slate-600">
              Create a live runtime session from a valid anchor payload, then keep the ask loop in
              the same session contract instead of the legacy AskAI page flow.
            </p>
          </div>
        </div>

        {surfaceState === 'loading' ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-sm text-slate-600 shadow-sm">
            Loading session...
          </div>
        ) : null}

        {surfaceState === 'error' ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-sm text-rose-700 shadow-sm">
            {error?.message || 'Failed to load session.'}
          </div>
        ) : null}

        {surfaceState === 'ready' ? (
          <LearningSessionShell
            viewModel={viewModel}
            onLauncherChange={handleLaunchFieldChange}
            onLaunch={handleLaunch}
            onAskChange={handleAskMessageChange}
            onAsk={handleAsk}
          />
        ) : null}
      </div>
    </div>
  );
}
