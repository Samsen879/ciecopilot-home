import crypto from 'node:crypto';
import { getServiceClient } from '../supabase/client.js';
import { authenticateRequest } from '../../middleware/auth.js';

const LOCAL_TEST_AUTH_SOURCE = 'local_test';
const LOCAL_TEST_USER_PAGE_SIZE = 200;

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
    key: userId,
    email: `${userId}@example.test`,
    role: role.toLowerCase(),
    user_metadata: {
      name: userId,
      role: role.toLowerCase(),
      auth_source: LOCAL_TEST_AUTH_SOURCE,
    },
    app_metadata: {
      role: role.toLowerCase(),
      auth_source: LOCAL_TEST_AUTH_SOURCE,
    },
  };
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function findLocalTestAuthUser(adminApi, email) {
  let page = 1;

  while (page) {
    const { data, error } = await adminApi.listUsers({
      page,
      perPage: LOCAL_TEST_USER_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Failed to list local test auth users: ${error.message}`);
    }

    const users = Array.isArray(data?.users) ? data.users : [];
    const match = users.find((user) => normalizeEmail(user?.email) === normalizeEmail(email));
    if (match) {
      return match;
    }

    const nextPage = Number(data?.nextPage ?? 0);
    if (!Number.isFinite(nextPage) || nextPage <= page) {
      return null;
    }

    page = nextPage;
  }

  return null;
}

async function createLocalTestAuthUser(adminApi, localTestIdentity) {
  const { data, error } = await adminApi.createUser({
    email: localTestIdentity.email,
    password: `LocalTest!${crypto.randomUUID()}`,
    email_confirm: true,
    user_metadata: localTestIdentity.user_metadata,
    app_metadata: localTestIdentity.app_metadata,
  });

  if (!error && data?.user) {
    return data.user;
  }

  const message = String(error?.message || '');
  if (message.toLowerCase().includes('already')) {
    return findLocalTestAuthUser(adminApi, localTestIdentity.email);
  }

  throw new Error(`Failed to create local test auth user: ${message || 'unknown error'}`);
}

async function ensureLocalTestAuthUser(localTestIdentity) {
  const client = getServiceClient();
  const adminApi = client?.auth?.admin;

  if (!adminApi?.listUsers || !adminApi?.createUser) {
    throw new Error('Supabase admin API is unavailable for local test auth.');
  }

  const existing = await findLocalTestAuthUser(adminApi, localTestIdentity.email);
  if (existing?.id) {
    return {
      ...existing,
      user_metadata: {
        ...existing.user_metadata,
        role: localTestIdentity.role,
        auth_source: LOCAL_TEST_AUTH_SOURCE,
      },
      app_metadata: {
        ...existing.app_metadata,
        role: localTestIdentity.role,
        auth_source: LOCAL_TEST_AUTH_SOURCE,
      },
    };
  }

  const created = await createLocalTestAuthUser(adminApi, localTestIdentity);
  if (!created?.id) {
    throw new Error('Local test auth user provisioning returned no user id.');
  }

  return created;
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
    const localTestIdentity = resolveLocalTestUser(token);
    if (!localTestIdentity) {
      return {
        ok: false,
        status: 401,
        code: 'auth_invalid',
        message: 'Invalid token.',
      };
    }

    try {
      const user = await ensureLocalTestAuthUser(localTestIdentity);
      return {
        ok: true,
        token,
        context: buildAuthContext(user, token, LOCAL_TEST_AUTH_SOURCE),
      };
    } catch (error) {
      return {
        ok: false,
        status: 500,
        code: 'auth_config_missing',
        message: error?.message || 'Local test auth provisioning failed.',
      };
    }
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
