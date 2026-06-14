# Frontend Runtime Trust Pass – Issue #462

## Scope and evidence boundaries
- Target artifacts: `src/App.jsx`, `src/pages/legacy-entry-mode.js`, `src/pages/learning-runtime/LearningSessionPage.jsx`, `src/pages/learning-runtime/TopicWorkspacePage.jsx`, `src/pages/learning-runtime/ReviewQueuePage.jsx`, `src/components/learning-runtime/**`, `src/api/learningRuntimeApi.js`, context roots, and nearby frontend tests.
- This is an inventory-only scan (no source edits, no behavior change) for safe planning in issue-chain stage.
- Canonical route constants and run-time composition are treated as authoritative when present in live imports.

## 1) Route and page-entry map for learning runtime

### Route constants
- `LEARNING_RUNTIME_SESSION_ROUTE_PATH = '/learn/session/:sessionId'`
- `LEARNING_RUNTIME_WORKSPACE_ROUTE_PATH = '/learn/workspace/:topicId'`
- `LEARNING_RUNTIME_REVIEW_QUEUE_ROUTE_PATH = '/learn/review-queue'`
- The above are declared in `src/pages/legacy-entry-mode.js`.

### Route composition in the app shell
- `src/App.jsx` wires the runtime routes by importing `LEARNING_RUNTIME_*` constants from `./pages/legacy-entry-mode`.
- `/learn/session/:sessionId` renders `LearningSessionPage`.
- `/learn/workspace/:topicId` renders `TopicWorkspacePage`.
- `/learn/review-queue` renders `ReviewQueuePage`.

### Internal page transition map
- Workspace page (`TopicWorkspacePage`) dispatches session launches through `navigate(LEARNING_SESSION_LAUNCH_PATH, { state: { launchPayload } })`, where launch path is the session entry constant.
- Session page launch flows also navigate to `LEARNING_RUNTIME_SESSION_ROUTE_PATH` with `sessionId` filled after create.
- Review queue launches by routing to the session create-entry (`/learn/session/new`) for direct question handoff or direct start.
- Workspace page completion/reschedule actions route back to the review queue via `LEARNING_RUNTIME_REVIEW_QUEUE_ROUTE_PATH`.

### Route-state and launch entry contract notes
- `LearningSessionPage` consumes both:
  - route params (`sessionId`)
  - navigation state (`state.launchPayload` / launch hints)
- Workspace entry currently supports launch payload transport for deferred/session initialization.
- No custom route guards were found at the router level; guards are implemented inside pages (request keys/ref checks and idempotency keys).

## 2) `LearningSessionPage.jsx` responsibility inventory

### Loading / mount lifecycle
- Reads `sessionId` from `useParams` and checks whether `sessionId === 'new'` to determine launcher behavior.
- Uses `surfaceState` and `sessionLoadStatus`-style flow to present loading/ready/error states.
- On mount / param change:
  - launcher path (`new`) primes surface state, clears active session state, and avoids fetch.
  - non-launch path loads `getSession(sessionId)` and binds returned payload into local session state.
- Uses route refs (`activeRouteSessionIdRef`, `isMountedRef`) to avoid stale async writes.

### Launch flow
- `handleLaunch` builds a launch payload (`buildSessionLaunchPayload`) and posts through `createSession` with an idempotency guard key.
- Uses `activeLaunchRequestKeyRef` to deduplicate/ignore duplicate/in-flight launch submissions.
- On success navigates to `/learn/session/:newSessionId`.
- Includes a post-mortem variant `handlePostMortemLaunch` using a dedicated handoff state.

### Import flow
- `handleImportQuestion` calls `importQuestion` with generated payload and idempotency key.
- Uses `activeImportRequestKeyRef` as request-identity guard.
- Tracks status via `importStatus` and surface/error states and stores imported draft payload for handoff.

### Handoff flow
- `handleImportHandoff` builds an imported-question launch payload from draft + current answer context.
- Submits via `createSession` with `activeImportHandoffRequestKeyRef` guard.
- On success routes into the same session runtime entry as regular launch.

### Ask/interaction loop
- `handleAsk` calls `askInSession(activeSessionId, { message, client_turn_id })`.
- Response is merged through `mergeAskResponseIntoSessionPayload` and turns/state are updated in local payload.
- Guarded by `shouldApplyAskResponse`, preventing stale responses from writing over newer state.
- Maintains ask request status/error via `askStatus` and `askError`.

### Route state / status model
- Additional operational refs: `activeRouteSessionIdRef`, `isLauncherSurfaceRef`, `skipReloadSessionIdRef`.
- State buckets include `surfaceState`, `launchStatus`, `importStatus`, `importHandoffStatus`, `askStatus`, plus separate error states per stage.
- This page is doing multiple coordinator responsibilities: data loading, orchestration, idempotent mutation dispatch, local state normalization and composition, and rendering condition transitions.

### Error model
- Errors are tracked per pipeline (`sessionLoadError`, `launchError`, `importError`, `askError`) rather than thrown globally.
- Error branches generally set a status/error state and keep UI in a recoverable surface state.

## 3) Context naming drift inventory (`src/context` vs `src/contexts`)

### Repository reality
- Singular context directory is used for AI state: `src/context/AIContext.jsx`.
- Plural context directory is used for theme/auth: `src/contexts/AuthContext.jsx`, `src/contexts/ThemeContext.jsx`.

### Import-site split
- `ThemeProvider` and `useTheme` are pulled from `./contexts/*` in `src/App.jsx`.
- `AuthProvider`/`useAuth` are pulled from `./contexts/AuthContext` in app-level and multiple feature pages/components.
- `AIProvider`/`useAIContext` are pulled from `./context/AIContext` (`App.jsx`, `components/ChatPanel.jsx`, `components/ChatWidget.jsx`, `components/SelectionListener.jsx`).

### Impact
- Naming drift is currently consistent by call-site but split across filesystem roots.
- There is no obvious cross-file ambiguity in compile-time imports, but cognitive load and future refactor risk are moderate: one domain (`AI`) has a different root path contract than neighboring cross-cutting contexts.

## 4) Frontend runtime view-model and component boundary map

### API contract edge
- `src/api/learningRuntimeApi.js` provides endpoint wrappers + normalizers for session, ask, import, workspace, and review-queue domains.
- Runtime pages consume these APIs directly and do local payload shaping via local `build*ViewModel` utilities.

### Session boundary
- `LearningSessionPage.jsx` responsibilities:
  - API fetch/create/ask/import for runtime session.
  - View-model + payload composition helpers to normalize server shapes.
  - UI branching into shell/import-intake mode.
- Child component responsibility boundary:
  - `SessionLauncher`/`LearningSessionShell`/`SessionAskComposer`/`ImportedQuestionIntake`/`ImportPostureBanner`/`Workspace*` components consume the derived session data and emit callbacks.

### Workspace boundary
- `TopicWorkspacePage.jsx` fetches workspace payload via API, builds workspace VM, and handles task mutation via `updateReviewTask`.
- UI components (`WorkspaceShell`, `WorkspaceArtifactCard`, `ReviewTaskActionBar`) handle display + action callbacks.

### Review-queue boundary
- `ReviewQueuePage.jsx` handles task listing and mutation only (`listReviewTasks`, `updateReviewTask`) and forwards launch/open actions.
- Queue rendering and task action controls are delegated to dedicated component primitives.

### Boundary risk
- Responsibilities are strongly page-centric rather than domain-sliced; page files own both orchestration and contract translation.
- Current test layout does not mirror page boundaries equally (see section 5).

## 5) Frontend test coverage map

### Covered under `src/components/learning-runtime/__tests__`
- `ImportPostureBanner.test.js`
- `ImportedQuestionIntake.test.js`
- `LearningSessionShell.test.js`
- `ReviewTaskActionBar.test.js`
- `SessionAskComposer.test.js`
- `SessionLauncher.test.js`
- `WorkspaceArtifactCard.test.js`
- `WorkspaceShell.test.js`
- `paper-workspace-frontend-smoke.test.js`
- `paper-workspace-view-model-adapters.test.js`
- `view-models.test.js`
- `workspace-contract-boundary.test.js`
- `compat-shell-retirements.test.js`
- `paper-workspace-contract-fixtures.test.js`

### Covered in API layer tests
- `src/api/__tests__/learningRuntimeApi.test.js` validates endpoint wrappers, normalization and key headers across create/ask/import/workspace/review APIs.

### Covered outside runtime folder
- `src/pages/__tests__/legacy-entry-mode.test.js` covers route constants and legacy route-mode mapping.

### Not covered (notable)
- No page-level tests were observed for:
  - `src/pages/learning-runtime/LearningSessionPage.jsx`
  - `src/pages/learning-runtime/TopicWorkspacePage.jsx`
  - `src/pages/learning-runtime/ReviewQueuePage.jsx`
- No hook-level tests in this surface were identified.
- No integration test that asserts end-to-end route transition lifecycle (workspace -> session -> queue) with real request-key guards.

## 6) P0/P1/P2 reviewer-impact findings

### P0
- None identified from scan evidence.

### P1
- **Split context folder contract (`src/context` vs `src/contexts`) increases refactor surface risk.**
  - Not a runtime crash in current paths, but introduces a durable ambiguity where new contributors may add incompatible conventions.
  - Evidence: live imports in App and components.
- **High untested runtime page orchestration.**
  - Session/workspace/review page-level behavior (routing, idempotency guards, route-state transitions, ask/import handoff coordination) is only indirectly covered through component tests.

### P2
- **No page-level route contract tests for runtime pages.**
  - Could allow regressions in param/state handling and transition side-effects.
- **Legacy route/test coverage and runtime implementation split can mask dead code or stale behavior.**
  - Runtime coverage is concentrated in component/API slices; controller-level tests lag page-level orchestration.

## 7) Small follow-up candidates (non-blocking)
- Add focused page-level tests for the three runtime pages to assert request-key dedupe, stale-response guards, and launcher/import route-state branches.
- Add a small boundary test suite for route-to-page transition contracts (`legacy-entry-mode` + `App.jsx` + launch payload state usage).
- Decide whether `src/context` and `src/contexts` should be unified or intentionally split with explicit documentation to reduce drift risk.
