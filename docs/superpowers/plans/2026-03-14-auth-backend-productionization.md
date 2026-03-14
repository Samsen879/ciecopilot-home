# Auth Backend Productionization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the existing auth backend's productionization gaps without redesigning auth, touching frontend/RAG, or modifying `supabase/migrations/*.sql`.

**Architecture:** Keep the current `/api/auth?action=...` module and JWT middleware, then tighten the missing edges around token validation, session lifecycle, mail delivery, abuse controls, and API contract consistency. New behavior must degrade safely when optional infra like `user_sessions`, `security_events`, or an external mail provider is unavailable.

**Tech Stack:** Node.js, Jest, custom API gateway/runtime, Supabase service client, JWT, bcryptjs

---

## Chunk 1: Lock Missing Auth Behaviors with Tests

### Task 1: Add failing tests for token verification, auth-context alignment, and mail fallback

**Files:**
- Create: `api/auth/__tests__/productionization.test.js`
- Modify: `api/lib/security/auth-context.js` (later implementation target)
- Modify: `api/auth/index.js` (later implementation target)

- [ ] **Step 1: Write the failing tests**

Add tests for:
- `verify` action returns token validity and user context for a login-issued JWT.
- gateway auth-context can resolve the same custom JWT format used by auth backend login.
- registration/reset mail delivery falls back to local/test logging instead of crashing when no provider is configured.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run api:test -- --runInBand api/auth/__tests__/productionization.test.js`
Expected: FAIL because verify action, auth-context fallback, or mail fallback behavior is incomplete.

- [ ] **Step 3: Write minimal implementation**

Implement only enough code to satisfy the failing tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run api:test -- --runInBand api/auth/__tests__/productionization.test.js`
Expected: PASS

### Task 2: Add failing tests for session persistence/rotation and auth route rate limiting

**Files:**
- Modify: `api/auth/__tests__/productionization.test.js`
- Modify: `api/_runtime/route-registry.js` (later implementation target)
- Modify: `api/lib/security/rate-limit-policy.js` (later implementation target)

- [ ] **Step 1: Write the failing tests**

Add tests for:
- login persists a session record when `user_sessions` exists and degrades safely when it does not.
- refresh validates and rotates the stored refresh session.
- `/api/auth` resolves a dedicated rate-limit policy from route registry.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run api:test -- --runInBand api/auth/__tests__/productionization.test.js`
Expected: FAIL on missing session persistence/rotation or missing rate-limit policy.

- [ ] **Step 3: Write minimal implementation**

Implement only the behavior needed for the tests to pass.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run api:test -- --runInBand api/auth/__tests__/productionization.test.js`
Expected: PASS

## Chunk 2: Implement Auth Productionization Fixes

### Task 3: Complete auth mail delivery and token/session helpers

**Files:**
- Modify: `api/auth/index.js`
- Modify: `api/middleware/auth.js`
- Create: `api/auth/lib/auth-mailer.js`

- [ ] **Step 1: Implement the auth mailer adapter**

Support:
- local/test log fallback
- provider-by-env dispatch
- no-provider graceful degradation

- [ ] **Step 2: Harden verification/reset token generation**

Replace weak random-code handling with production-safe token generation and storage/lookup helpers that do not require schema changes.

- [ ] **Step 3: Add session lifecycle support**

Persist login sessions when possible and rotate/invalidate refresh sessions safely when `user_sessions` is available.

- [ ] **Step 4: Re-run focused tests**

Run: `npm run api:test -- --runInBand api/auth/__tests__/productionization.test.js`
Expected: PASS

### Task 4: Align gateway auth semantics with auth backend tokens

**Files:**
- Modify: `api/lib/security/auth-context.js`
- Modify: `api/middleware/auth.js`

- [ ] **Step 1: Implement custom-JWT auth-context fallback**

Let protected-route auth recognize the same auth backend JWTs while preserving local test mode and safe failure semantics.

- [ ] **Step 2: Normalize returned auth context**

Ensure `req.auth_user_id`, `req.auth_user`, and related fields remain compatible with existing protected-route consumers.

- [ ] **Step 3: Re-run auth/gateway security tests**

Run: `npm run api:test -- --runInBand api/auth/__tests__/productionization.test.js api/__tests__/security-baseline.test.js api/__tests__/security-depth.test.js`
Expected: PASS

### Task 5: Add auth route abuse protection, audit events, and response consistency

**Files:**
- Modify: `api/_runtime/route-registry.js`
- Modify: `api/lib/security/rate-limit-policy.js`
- Modify: `api/auth/index.js`

- [ ] **Step 1: Add a dedicated auth rate-limit policy**

Attach a gateway-level auth rate-limit policy to `/api/auth`.

- [ ] **Step 2: Emit auth audit events**

Use the existing security event path for the main auth lifecycle events.

- [ ] **Step 3: Normalize auth API envelopes**

Add stable `code` and `success` semantics while preserving current user-facing data.

- [ ] **Step 4: Re-run focused tests**

Run: `npm run api:test -- --runInBand api/auth/__tests__/productionization.test.js api/__tests__/shared-rate-limit.test.js`
Expected: PASS

## Chunk 3: Docs, Verification, and Review

### Task 6: Add minimal auth runtime documentation

**Files:**
- Create or Modify: `docs/setup/README_AUTH.md`
- Modify: `docs/API_DOCUMENTATION.md`

- [ ] **Step 1: Document the active auth route shape**

State the real runtime contract: `/api/auth?action=...`

- [ ] **Step 2: Document local/test mail behavior**

Cover:
- how to run locally
- how mail falls back when no provider is configured
- which env vars enable provider-backed sending

- [ ] **Step 3: Run documentation-sensitive verification**

Run a search command to verify outdated auth path examples are corrected or clearly superseded.

### Task 7: Final verification and code review

**Files:**
- Verify the whole auth productionization change set

- [ ] **Step 1: Run the focused auth verification suite**

Run: `npm run api:test -- --runInBand api/auth/__tests__/productionization.test.js api/middleware/__tests__/auth-unification.test.js api/_runtime/__tests__/adapter.test.js api/__tests__/security-baseline.test.js api/__tests__/security-depth.test.js api/__tests__/shared-rate-limit.test.js`
Expected: PASS

- [ ] **Step 2: Run a route-registry contract check**

Run: `npm run api:test -- --runInBand api/__tests__/api-route-integration.test.js`
Expected: PASS

- [ ] **Step 3: Request code review**

Dispatch a reviewer against the auth productionization diff and address any important findings before completion.
