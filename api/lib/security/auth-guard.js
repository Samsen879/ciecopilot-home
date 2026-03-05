import { requireTrustedAuthContext, resolveTrustedAuthContext } from './auth-context.js';

export async function resolveJwtUser(req) {
  const result = await resolveTrustedAuthContext(req);
  if (!result.ok) return result;
  return {
    ok: true,
    token: result.token,
    user: result.context.user,
  };
}

export async function requireAuth(req) {
  return requireTrustedAuthContext(req);
}
