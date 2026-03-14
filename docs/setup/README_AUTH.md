# Auth Backend Runtime Notes

## Active Route Shape

Auth does not use path-split endpoints like `/api/auth/login`.

The active runtime route is:

- `POST /api/auth?action=register`
- `POST /api/auth?action=login`
- `POST /api/auth?action=refresh`
- `GET /api/auth?action=verify`
- `GET /api/auth?action=verify-email&code=<token>`
- `POST /api/auth?action=request-reset`
- `POST /api/auth?action=reset-password`

The route is registered in [api/_runtime/route-registry.js](/C:/Users/Samsen/cie-copilot/.worktrees/codex-auth-prod/api/_runtime/route-registry.js#L187).

## Local/Test Environment

Minimum server env for local auth backend work:

```powershell
$env:SUPABASE_URL="https://<project>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
$env:JWT_SECRET="replace-with-a-long-random-secret"
$env:ALLOWED_ORIGINS="http://localhost:3000"
```

Optional mail/env settings:

```powershell
$env:AUTH_PUBLIC_BASE_URL="http://localhost:3000"
$env:AUTH_EMAIL_MODE="log"
```

## Mail Delivery Modes

Auth mail delivery is implemented through `api/auth/lib/auth-mailer.js`.

Supported behavior:

- `AUTH_EMAIL_MODE=log`
  Local/test-safe default. Verification and reset links are written to server logs through `console.info(...)`.
- `AUTH_EMAIL_MODE=disabled`
  No provider call is attempted. The API still completes and logs a disabled delivery artifact.
- `AUTH_EMAIL_MODE=resend`
  Uses `RESEND_API_KEY` and `AUTH_EMAIL_FROM`. If provider delivery fails, the backend falls back to `log`.

If no provider is configured, auth does **not** block local development. It degrades to logged delivery artifacts.

## How to Use Logged Mail Artifacts

### Email verification

When `AUTH_EMAIL_MODE=log`, registration writes a verification link containing:

```text
/api/auth?action=verify-email&code=<token>
```

Open that URL to activate the account.

### Password reset

When `AUTH_EMAIL_MODE=log`, password-reset requests write a reset artifact containing:

```text
/api/auth?action=reset-password&token=<token>
```

Use the token value from that logged link in:

```json
POST /api/auth?action=reset-password
{
  "token": "<token>",
  "newPassword": "abc12345"
}
```

## Verification Commands

Focused auth regression suite:

```powershell
npm run api:test -- --runInBand api/auth/__tests__/productionization.test.js api/middleware/__tests__/auth-unification.test.js api/_runtime/__tests__/adapter.test.js api/__tests__/security-baseline.test.js api/__tests__/security-depth.test.js api/__tests__/shared-rate-limit.test.js api/__tests__/api-route-integration.test.js
```
