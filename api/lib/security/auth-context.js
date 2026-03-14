import { getServiceClient } from '../supabase/client.js';
import { authenticateRequest } from '../../middleware/auth.js';

export function parseBearerToken(req) {
  const raw = req?.headers?.authorization || req?.headers?.Authorization;
  if (!raw || typeof raw !== 'string') return null;
  const [scheme, token] = raw.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token.trim();
}

function normalizeRole(user) {
  return (
    user?.user_metadata?.role ||
    user?.app_metadata?.role ||
    user?.role ||
    'student'
  );
}

function buildAuthContext(user, token, source = 'supabase') {
  return {
    userId: user.id,
    role: normalizeRole(user),
    user,
    token,
    source,
  };
}

function buildCustomJwtContext(authResult, token) {
  return {
    userId: authResult.user.id,
    role: authResult.user.role,
    user: authResult.user.profile || authResult.user,
    token,
    source: 'custom_jwt',
    permissions: authResult.user.permissions || [],
  };
}

function resolveLocalTestUser(token) {
  const match = /^test-user:([^:]+):([a-z_]+)$/i.exec(String(token || '').trim());
  if (!match) return null;
  const [, userId, role] = match;
  return {
    id: userId,
    email: `${userId}@example.test`,
    user_metadata: { role: role.toLowerCase() },
    app_metadata: { role: role.toLowerCase() },
  };
}

export async function resolveTrustedAuthContext(req) {
  const token = parseBearerToken(req);
  if (!token) {
    return {
      ok: false,
      status: 401,
      code: 'auth_required',
      message: 'Missing Bearer token.',
    };
  }

  if (process.env.AUTH_LOCAL_TEST_MODE === 'true') {
    const user = resolveLocalTestUser(token);
    if (!user) {
      return {
        ok: false,
        status: 401,
        code: 'auth_invalid',
        message: 'Invalid token.',
      };
    }
    return {
      ok: true,
      token,
      context: buildAuthContext(user, token, 'local_test'),
    };
  }

  try {
    const client = getServiceClient();
    const { data, error } = await client.auth.getUser(token);
    if (!error && data?.user) {
      return {
        ok: true,
        token,
        context: buildAuthContext(data.user, token, 'supabase'),
      };
    }
  } catch (error) {
    // Fall through to custom JWT validation.
  }

  const authResult = await authenticateRequest(req, { optional: false });
  if (authResult.success) {
    return {
      ok: true,
      token,
      context: buildCustomJwtContext(authResult, token),
    };
  }

  return {
    ok: false,
    status: authResult.status || 401,
    code:
      authResult.error === 'access_token_required'
        ? 'auth_required'
        : authResult.status >= 500 || authResult.error === 'auth_config_missing'
          ? 'auth_config_missing'
          : 'auth_invalid',
    message: authResult.message || 'Invalid token.',
  };
}

export async function requireTrustedAuthContext(req) {
  const result = await resolveTrustedAuthContext(req);
  if (!result.ok) return result;
  req.auth_context = result.context;
  req.auth_user_id = result.context.userId;
  req.auth_user = result.context.user;
  return result;
}
