import { getServiceClient } from '../supabase/client.js';

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

  let client;
  try {
    client = getServiceClient();
  } catch (error) {
    return {
      ok: false,
      status: 500,
      code: 'auth_config_missing',
      message: error?.message || 'Supabase auth config missing.',
    };
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) {
    return {
      ok: false,
      status: 401,
      code: 'auth_invalid',
      message: error?.message || 'Invalid token.',
    };
  }

  return {
    ok: true,
    token,
    context: buildAuthContext(data.user, token, 'supabase'),
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
