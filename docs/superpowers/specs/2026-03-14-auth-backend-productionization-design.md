# Auth Backend Productionization Design

**Date:** 2026-03-14
**Scope owner:** Codex auth backend productionization line
**Worktree:** `C:\Users\Samsen\cie-copilot\.worktrees\codex-auth-prod`

## Goal

Take the existing auth backend closer to production readiness without redesigning the identity system, touching frontend integration, modifying `supabase/migrations/*.sql`, or changing any RAG behavior.

## Locked Facts

1. Auth backend primitives already exist in [api/auth/index.js](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/api/auth/index.js), including register, login, refresh, verify-email, request-reset, and reset-password handlers.
2. Email verification and password-reset delivery are still TODOs in [api/auth/index.js](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/api/auth/index.js#L242) and [api/auth/index.js](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/api/auth/index.js#L558).
3. Auth middleware already has JWT validation, permission checks, security event recording, and session validation hooks in [api/middleware/auth.js](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/api/middleware/auth.js).
4. The gateway currently exposes auth publicly via [api/_runtime/route-registry.js](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/api/_runtime/route-registry.js#L185).
5. The gateway's protected-route auth path currently resolves through [api/lib/security/auth-context.js](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/api/lib/security/auth-context.js#L42), which does not currently align with the login-issued JWTs in [api/auth/index.js](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/api/auth/index.js#L340).

## Production Gaps

### 1. Mail delivery gap

- Registration and password-reset flows generate verification/reset artifacts, but do not dispatch mail.
- Local/test behavior is not formalized, so there is no production-safe fallback when no provider is configured.

### 2. Token semantics gap

- Login emits custom JWTs, but protected-route auth is resolved elsewhere.
- Refresh tokens are not backed by a persisted session lifecycle in the existing login flow.
- There is no explicit auth API token verification endpoint even though token verification is part of the target flow.

### 3. Abuse protection gap

- Login-attempt counting exists per email, but `/api/auth` does not have a gateway-level rate-limit policy.
- Critical auth actions do not consistently emit auth audit events.

### 4. Consistency gap

- Auth responses use mixed shapes and missing machine-readable codes.
- Existing docs still describe outdated auth endpoints in [docs/API_DOCUMENTATION.md](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/docs/API_DOCUMENTATION.md#L48).

## Non-Goals

- No frontend integration.
- No RAG changes.
- No unrelated refactors.
- No `supabase/migrations/*.sql` changes.
- No replacement of the overall identity model with a different auth provider.

## Minimal Complete Scope

### A. Close the auth token loop

- Add one explicit auth token verification action under `/api/auth?action=verify`.
- Make gateway/protected-route auth accept the same login-issued JWT semantics as the auth backend.
- Persist and validate session lifecycle when `user_sessions` exists, while degrading safely when the session table is absent or disabled.

### B. Complete email-driven flows

- Replace TODO mail gaps with a small auth mailer adapter.
- Support provider-backed sending only through env vars.
- Support local/test fallback with logged delivery artifacts so local development is not blocked.

### C. Harden abuse handling and auditability

- Add a minimal gateway rate-limit policy for `/api/auth`.
- Record auth audit/security events for registration, login success/failure, verification, password-reset request, and password reset completion.
- Keep responses generic where needed to avoid account enumeration.

### D. Normalize API contract and docs

- Standardize auth success/error envelopes enough to include stable machine-readable codes without breaking the current flow shape.
- Add focused auth tests.
- Add a minimal auth runtime document that explains local/test mode and no-provider mail fallback.

## Implementation Shape

### Files expected to change

- [api/auth/index.js](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/api/auth/index.js)
- [api/middleware/auth.js](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/api/middleware/auth.js)
- [api/lib/security/auth-context.js](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/api/lib/security/auth-context.js)
- [api/_runtime/route-registry.js](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/api/_runtime/route-registry.js)
- [api/lib/security/rate-limit-policy.js](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/api/lib/security/rate-limit-policy.js)
- New focused auth tests under `api/auth/__tests__/`
- Minimal doc update/addition under `docs/`

### Risks to contain

- Avoid breaking existing protected routes while aligning token semantics.
- Keep mail delivery optional in local/test environments.
- Do not require schema changes for session or mail behavior.

## Deliverables

1. Auth productionization scope with fixed-path evidence.
2. Issue list tied to concrete files and lines.
3. Minimal code fixes for auth backend productionization.
4. Focused auth tests and verification commands.
5. Clear local/test mail-flow instructions with no-provider fallback.
6. A final split between completed items, deferred items, and follow-up recommendations.
