# Backend Route/API Contract Trust-Pass Scan

Issue: [#463](https://github.com/Samsen879/ciecopilot-home/issues/463)
Parent: [#460](https://github.com/Samsen879/ciecopilot-home/issues/460)
Date: 2026-06-14

## 1) Scope

- Read-only trust pass for backend API gateway + route registry + auth/rate-limit/error-envelope boundaries.
- Focus files:
  - `api/index.js`
  - `api/_runtime/route-registry.js`
  - `api/_runtime/*`
  - `api/lib/security/*`
  - `api/middleware/*`
  - `api/learning/*`
  - `api/evidence/*`
  - `api/marking/*`
  - `api/rag/*`
- Required output artifact only; no source behavior changes were performed.

## 2) API Gateway Responsibility Map

### 2.1 Request/Response envelope

- The gateway normalizes every incoming request via `adaptRequestBasics(req)` before routing:
  - sets `req.path`, parses query into objects (multi-value arrays preserved), assigns `req.request_id` from `x-request-id` (or generated UUID). [api/index.js:198-199](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L198-L199), [api/_runtime/request-adapter.js:125-131](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/request-adapter.js#L125-L131)
- Response helpers are injected once per request with `adaptResponse(req)`:
  - ensures `status`, `json`, `send`, and `Content-Type: application/json` are present, and writes `X-Request-Id`. [api/index.js:196-200](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L196-L200), [api/_runtime/response-adapter.js:157-165](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/response-adapter.js#L157-L165)

### 2.2 CORS and internal route exceptions

- Global CORS policy is enforced in gateway prior to route resolution:
  - denied origins return `cors_origin_denied` with 403; allowed origin plus methods headers + 204 for OPTIONS. [api/index.js:20-61](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L20-L61)
- Internal route handling:
  - `/api`, `/api/info`, `/api/health`, `/api/routes` are handled directly with route listing and environment-based redaction. [api/index.js:79-105](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L79-L105)
- Legacy exclusions short-circuit with explicit 404 and hint:
  - `/api/chat`, `/api/rag/chat`, `/api/ai/tutor/chat`, `/api/marking/evaluate`. [api/_runtime/route-registry.js:4-9](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L4-L9), [api/index.js:108-119](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L108-L119)

### 2.3 Auth guard

- Gateway-level gate is conditional on route metadata:
  - only routes with `route.auth === 'jwt_required'` invoke `requireAuth(req)`. [api/index.js:122-135](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L122-L135)
- Auth result is translated to standardized security envelope through `sendSecurityFailure`. [api/index.js:126-134](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L126-L134), [api/lib/security/error-envelope.js:19-28](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/lib/security/error-envelope.js#L19-L28)
- Most production runtime routes are still implemented with handler-level JWT checks (`ensureLearningAuth`, etc.), but all are under `jwt_required` in registry.

### 2.4 Rate-limit boundary

- Gateway enforces rate limit only when route defines policy. `rateLimitMethods` can scope POST-only routes. [api/_runtime/rate-limit-middleware.js:175-184](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/rate-limit-middleware.js#L175-L184), [api/_runtime/rate-limit-middleware.js:197-207](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/rate-limit-middleware.js#L197-L207)
- Route metadata carries `rateLimitPolicyId`, `rateLimit`, `rateLimitMethods`. See registry entries for RAG, auth, error-book routes. [api/_runtime/route-registry.js:174-220](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L174-L220)
- Rate-limit policies resolve defaults: `rag_ai_default_v1`, `error_book_write_v1`, `auth_public_v1`. [api/lib/security/rate-limit-policy.js:109-128](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/lib/security/rate-limit-policy.js#L109-L128), [api/_runtime/route-registry.js:11-16](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L11-L16)

### 2.5 Body parsing and parser limits

- Body JSON parsing is centrally performed by `ensureParsedJsonBody` with a default 1MB cap.
- Applied immediately before handler invocation for every route handler load path. [api/_runtime/request-adapter.js:62-67](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/request-adapter.js#L62-L67), [api/index.js:192-193](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L192-L193)

### 2.6 Logging and redaction

- Gateway logs warn/error events with redacted metadata (`safeLog` + `redact`). [api/index.js:143-151](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L143-L151), [api/lib/security/redaction.js:320-336](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/lib/security/redaction.js#L320-L336)
- `safeLog` redacts known sensitive keys (`authorization`, `token`, `secret`, ...). [api/lib/security/redaction.js:277-299](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/lib/security/redaction.js#L277-L299)

### 2.7 Handler loading contract

- Runtime loads handler via `loadHandler`/cache with express-router detection + required export checks.
- Express-router routes are mounted with rewritten subpath; non-router handlers receive parsed body. [api/index.js:165-193](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L165-L193), [api/_runtime/handler-loader.js:170-205](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/handler-loader.js#L170-L205)

## 3) Route Registry Inventory

### 3.1 Core learning routes

| Module | Path | Methods | Auth mode | Rate limit | Notes |
|---|---|---:|---|---|---|
| learning-sessions-ask | `/api/learning/sessions/:id/ask` | POST, OPTIONS | `jwt_required` / authenticated | none | route first in list |
| learning-sessions-id | `/api/learning/sessions/:id` | GET, OPTIONS | `jwt_required` / authenticated | none | dynamic |
| learning-sessions | `/api/learning/sessions` | POST, OPTIONS | `jwt_required` / authenticated | none | |
| learning-questions-import | `/api/learning/questions/import` | POST, OPTIONS | `jwt_required` / authenticated | none | |
| learning-questions | `/api/learning/questions` | GET, OPTIONS | `jwt_required` / authenticated | none | |
| learning-workspace-paper | `/api/learning/workspaces/papers/:paperScope` | GET, POST, OPTIONS | `jwt_required` / authenticated | none | decodeURIComponent wrapper |
| learning-workspace-topic | `/api/learning/workspaces/:topicId` | GET, POST, OPTIONS | `jwt_required` / authenticated | none | |

[api/_runtime/route-registry.js:18-105](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L18-L105)

### 3.2 Review/artifact/evidence/rag/marking/error-book/auth

| Module | Path | Methods | Auth mode | Rate limit |
|---|---|---|---|---|
| learning-review-task-id | `/api/learning/review-tasks/:id` | PATCH, OPTIONS | `jwt_required` / authenticated | none |
| learning-review-tasks | `/api/learning/review-tasks` | GET, OPTIONS | `jwt_required` / authenticated | none |
| learning-artifact-id | `/api/learning/artifacts/:id` | PATCH, OPTIONS | `jwt_required` / authenticated | none |
| recommendations-preferences | `/api/recommendations/preferences` | * | `jwt_required` / authenticated | none |
| recommendations-learning-data | `/api/recommendations/learning-data` | * | `jwt_required` / authenticated | none |
| recommendations | `/api/recommendations` | * | `jwt_required` / authenticated | none |
| rag-search | `/api/rag/search` | POST, OPTIONS | `jwt_required` / authenticated | `rag_ai_default_v1` |
| rag-ask | `/api/rag/ask` | POST, OPTIONS | `jwt_required` / authenticated | `rag_ai_default_v1` |
| marking-evaluate-v1 | `/api/marking/evaluate-v1` | POST, OPTIONS | `jwt_required` / authenticated | none |
| error-book-id | `/api/error-book/:id` | GET, PATCH, DELETE, OPTIONS | `jwt_required` / ownership | `error_book_write_v1` (PATCH/DELETE) |
| error-book | `/api/error-book` | GET, POST, OPTIONS | `jwt_required` / ownership | `error_book_write_v1` (POST) |
| evidence-context | `/api/evidence/context` | GET, OPTIONS | `jwt_required` / authenticated | none |
| auth | `/api/auth` | * | public | `auth_public_v1` |

[api/_runtime/route-registry.js:106-241](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L106-L241)

### 3.3 Dynamic route matching and legacy exclusions

- Matching is linear scan order-sensitive; pattern/dynamic match runs before method gating. [api/_runtime/route-registry.js:243-262](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L243-L262)
- Legacy exclusion list is explicit and checked before registry matching in gateway. [api/_runtime/route-registry.js:4-9](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L4-L9), [api/index.js:108-111](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L108-L111)

## 4) Existing Route-Registry and Boundary Coverage Map

### 4.1 Covered by route-registry tests

- `api/_runtime/__tests__/route-registry-learning.test.js`
  - verifies frozen learning routes are present, dynamic order of learning routes, and method-rejected matches still map to expected handlers.
  - verifies subtree rejection and encoded paperScope bounds (one-segment scope). [api/_runtime/__tests__/route-registry-learning.test.js:3-167](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/__tests__/route-registry-learning.test.js#L3-L167)
- `api/_runtime/__tests__/route-registry-retirements.test.js`
  - verifies retired routes are absent and legacy file is removed. [api/_runtime/__tests__/route-registry-retirements.test.js:6-203](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/__tests__/route-registry-retirements.test.js#L6-L203)
- `api/_runtime/__tests__/adapter.test.js`
  - verifies request path/query parsing and response helper injection. [api/_runtime/__tests__/adapter.test.js:43-88](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/__tests__/adapter.test.js#L43-L88)

### 4.2 Boundary coverage outside route-registry tests (runtime contracts)

- Learning endpoint behavior is covered in domain tests:
  - sessions API, session-ask, question search/import, review-task, artifact lifecycle. [api/learning/__tests__/session-api.test.js](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/__tests__/session-api.test.js), [api/learning/__tests__/question-search-api.test.js](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/__tests__/question-search-api.test.js), [api/learning/__tests__/session-ask.test.js](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/__tests__/session-ask.test.js), [api/learning/__tests__/review-task-api.test.js](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/__tests__/review-task-api.test.js), [api/learning/__tests__/artifact-api.test.js](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/__tests__/artifact-api.test.js)
- API-level productionization checks exist for auth, rag retirements, recommendations, error-book. [api/auth/__tests__/productionization.test.js](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/auth/__tests__/productionization.test.js), [api/rag/__tests__/retirements.test.js](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/rag/__tests__/retirements.test.js), [api/recommendations/__tests__/productionization.test.js](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/recommendations/__tests__/productionization.test.js), [api/error-book/__tests__/error-book-api.test.js](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/error-book/__tests__/error-book-api.test.js)

### 4.3 What is explicitly not covered by route-registry tests

- No direct test in route-registry suite validates duplicate module/path combos across all routes.
- No test validates registry policy invariants for auth/rate-limit completeness by route matrix outside learning subset.

## 5) Learning Runtime Contract Map

- **Sessions**
  - POST `/api/learning/sessions` creates session via `createLearningSession`, with idempotency headers and auth guard fallback. [api/learning/sessions/index.js:21-52](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/sessions/index.js#L21-L52)
  - GET `/api/learning/sessions/:id` reads session by ID through `readLearningSession` and `req.query.id`. [api/learning/sessions/[id].js:21-43](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/sessions/[id].js#L21-L43)
- **Ask**
  - POST `/api/learning/sessions/:id/ask` validates method and auth, normalizes context, calls `askWithinLearningSession`, catches explicit known errors, and returns normalized learning payload. [api/learning/sessions/[id]/ask.js:53-124](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/sessions/[id]/ask.js#L53-L124)
- **Questions**
  - `/api/learning/questions` GET path with product flag and service query mode. [api/learning/questions/index.js:34-65](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/questions/index.js#L34-L65)
  - `/api/learning/questions/import` POST path validates auth and delegates to import service. [api/learning/questions/import.js:31-77](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/questions/import.js#L31-L77)
- **Workspaces**
  - `/api/learning/workspaces/:topicId` GET/POST action=ensure workflow with workspace projection response compatibility enrichment. [api/learning/workspaces/[topicId].js:35-91](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/workspaces/[topicId].js#L35-L91)
  - `/api/learning/workspaces/papers/:paperScope` GET/POST with decoded encoded `paperScope`, optional topic action filters, and topic/source path validation paths. [api/learning/workspaces/papers/[paperScope].js:1-120](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/workspaces/papers/[paperScope].js#L1-L120)
- **Review tasks**
  - `/api/learning/review-tasks` GET listing and `/api/learning/review-tasks/:id` PATCH lifecycle transitions with explicit intent and no status-only patch. [api/learning/review-tasks/index.js:31-66](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/review-tasks/index.js#L31-L66), [api/learning/review-tasks/[id].js:14-44](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/review-tasks/[id].js#L14-L44)
- **Artifacts**
  - `/api/learning/artifacts/:id` PATCH lifecycle writes only via explicit `intent` (`set_placement_status`, `mark_contested`, `attach_superseded_by`); rejects generic `state` field.
- [api/learning/artifacts/[id].js:5-76](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/learning/artifacts/[id].js#L5-L76)

## 6) RAG / Marking / Evidence Boundary Inventory (where it intersects route trust)

- `/api/rag/search` and `/api/rag/ask`
  - Registry marks these routes as authenticated with POST-only and shared `rag_ai_default_v1` rate policy.
  - handlers normalize input, enforce method, and map domain errors via `toRagError`. [api/rag/search.js:30-64](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/rag/search.js#L30-L64), [api/rag/ask.js:17-56](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/rag/ask.js#L17-L56), [api/_runtime/route-registry.js:168-186](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L168-L186)
- `/api/marking/evaluate-v1`
  - Registry route is authenticated; handler-level gate for feature flag + JWT enforcement and strict question mapping. [api/_runtime/route-registry.js:188-194](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L188-L194), [api/marking/evaluate-v1.js:190-239](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/marking/evaluate-v1.js#L190-L239)
- `/api/error-book` and `/api/error-book/:id`
  - Registry adds ownership-mode auth and applies `error_book_write_v1` with method-scoped rate limits.
  - Handler enforces trusted auth and per-method branching; body/state mutation paths remain ownership scoped in contract. [api/_runtime/route-registry.js:196-221](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L196-L221), [api/error-book/index.js:47-73](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/error-book/index.js#L47-L73), [api/error-book/[id].js:51-93](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/error-book/[id].js#L51-L93)
- `/api/evidence/context`
  - Registry requires JWT auth; handler validates `topic_path` query, resolves user by auth, and returns serialized learning runtime context (`active_scope_bundle`, `session`, `workspace`) for trust boundary between learning and evidence. [api/_runtime/route-registry.js:223-229](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L223-L229), [api/evidence/context.js:198-269](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/evidence/context.js#L198-L269), [api/evidence/lib/evidence-context-validator.js:506-521](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/evidence/lib/evidence-context-validator.js#L506-L521)

## 7) Trust Gaps (manual schema/consistency hardening)

1. **Gateway-level schema and contract validation is intentionally thin**
   - Gateway resolves path/method/auth/rate only; detailed payload validation mostly remains per-handler. This is acceptable but means malformed payloads travel deeply before rejection. [api/index.js:206-230](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L206-L230), [api/_runtime/request-adapter.js:133-153](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/request-adapter.js#L133-L153)
2. **Duplicate path/method conflict detection is not enforced centrally**
   - `listRoutes` reports current route config, but `findRoute` returns first match without conflict checks. This depends on ordered manual governance and tests focused on learning subset. [api/_runtime/route-registry.js:256-263](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L256-L263)
3. **Rate-limit coverage is selective, not universal**
   - Only selected APIs declare policy metadata in registry. Authenticated/high-impact routes without explicit policy rely on outer layers. [api/_runtime/route-registry.js:274-277](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L274-L277)
4. **Legacy exclusion list is static and manual**
   - Explicitly excluded set is clear, but there is no dynamic validation tying retired-path policy to deploy-time registry lints. [api/_runtime/route-registry.js:4-9](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L4-L9), [api/index.js:108-119](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L108-L119)

## 8) P0 / P1 / P2 Findings

- **P0: None identified** in the current route-registry/gateway/learning contract scan.
- **P1: High**
  - No automated duplicate-path/method conflict check in registry. Because `findRoute` is first-match, accidental duplicate insertion can silently shadow routes and change auth/rate guarantees (especially where route order changes). [api/_runtime/route-registry.js:256-263](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L256-L263)
- **P1: Medium**
  - No machine-readable schema binding in gateway contract stage; request validation happens per-handler, which can allow inconsistent envelopes and deferred rejection semantics across surfaces. [api/index.js:192-194](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/index.js#L192-L194), [api/_runtime/request-adapter.js:133-153](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/request-adapter.js#L133-L153)
- **P2: Medium-Low**
  - Limited route-level observability linkage: `legacy_excluded` list and route listing do not encode policy proofs (e.g., why a route is allowed/method-mapped). [api/_runtime/route-registry.js:4-9](file:///home/samsen/.worktrees/ciecopilot-home/cie-306/api/_runtime/route-registry.js#L4-L9)

## 9) Recommended next-step minimal backend cleanup checks (before any runtime patch)

1. Add registry lint for duplicate path/method collisions and missing `methods`/auth/rate metadata for production-bound routes.
2. Add a generated contract test that validates `listRoutes()` invariants against canonical route policy expectations for non-learning modules.
3. Add schema assertions for gateway-level 405/400 envelopes where consistent envelopes are already defined in handlers.
4. Preserve this scan as the baseline for follow-on issue #463 evidence and sign-off.
