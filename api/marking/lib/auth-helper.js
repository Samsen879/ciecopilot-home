// api/marking/lib/auth-helper.js
// JWT authentication helper for Evidence Ledger.
// Resolves trusted user_id from Authorization header via Supabase auth.getUser().
// Falls back to body.user_id when EVIDENCE_LEDGER_ENABLED is not true (legacy mode).

import { getServiceClient } from '../../lib/supabase/client.js';

// ── Custom error class for auth failures ────────────────────────────────────
export class AuthError extends Error {
  /**
   * @param {string} message
   * @param {number} [status=401]
   */
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

// ── Feature flag helpers ────────────────────────────────────────────────────

/**
 * Check whether the Evidence Ledger write path is enabled.
 * @returns {boolean}
 */
export function isLedgerEnabled() {
  return process.env.EVIDENCE_LEDGER_ENABLED === 'true';
}

// ── JWT user cache (token -> user_id) to avoid repeated auth round-trips ───
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;
const TOKEN_CACHE_MAX_SIZE = 500;
const _tokenUserCache = new Map();

function readTokenCache(token) {
  const item = _tokenUserCache.get(token);
  if (!item) return null;
  if (Date.now() >= item.expiresAt) {
    _tokenUserCache.delete(token);
    return null;
  }
  return item.user_id;
}

function writeTokenCache(token, userId) {
  if (_tokenUserCache.size >= TOKEN_CACHE_MAX_SIZE) {
    const firstKey = _tokenUserCache.keys().next().value;
    if (firstKey) _tokenUserCache.delete(firstKey);
  }
  _tokenUserCache.set(token, {
    user_id: userId,
    expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
  });
}

// ── Lazy Supabase client for auth verification ──────────────────────────────
let _authClient = null;

function getAuthClient() {
  if (_authClient) return _authClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  _authClient = getServiceClient();
  return _authClient;
}

// ── Main resolver ───────────────────────────────────────────────────────────

/**
 * Resolve a trusted user_id from the incoming request.
 *
 * Strategy:
 * 1. Try to extract a Bearer token from the Authorization header.
 * 2. Verify the token via supabase.auth.getUser(token).
 * 3. Return { user_id, auth_source: 'jwt' } on success.
 *
 * Backward compatibility:
 * - When EVIDENCE_LEDGER_ENABLED is NOT true, fall back to body.user_id
 *   if no valid JWT is present (legacy behaviour).
 * - When EVIDENCE_LEDGER_ENABLED is true, a valid JWT is mandatory;
 *   missing or invalid tokens throw AuthError (HTTP 401).
 *
 * @param {object} req - HTTP request (must have .headers and .body)
 * @param {object} [options]
 * @param {boolean} [options.requireJwt=false] - Force JWT-only mode regardless of feature flags
 * @returns {Promise<{user_id: string, auth_source: 'jwt'|'body'}>}
 * @throws {AuthError} when ledger is enabled and no valid JWT is present
 */
export async function resolveUserId(req, options = {}) {
  const { requireJwt = false } = options;
  const jwtRequired = requireJwt || isLedgerEnabled();
  const token = extractBearerToken(req);

  // Attempt JWT verification when a token is present
  if (token) {
    const cachedUserId = readTokenCache(token);
    if (cachedUserId) {
      return { user_id: cachedUserId, auth_source: 'jwt' };
    }

    const supabase = getAuthClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (!error && data?.user?.id) {
      writeTokenCache(token, data.user.id);
      return { user_id: data.user.id, auth_source: 'jwt' };
    }

    // Token was provided but invalid — if ledger is enabled this is fatal
    if (jwtRequired) {
      throw new AuthError(
        error?.message || 'Invalid or expired JWT token.',
      );
    }
  }

  // No token (or invalid token in legacy mode) — try body fallback
  if (jwtRequired) {
    throw new AuthError('Authorization header with valid Bearer token is required when Evidence Ledger is enabled.');
  }

  const bodyUserId = req.body?.user_id;
  if (!bodyUserId) {
    throw new AuthError('No user_id found in request body.', 400);
  }

  return { user_id: bodyUserId, auth_source: 'body' };
}

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Extract Bearer token from the Authorization header.
 * @param {object} req
 * @returns {string|null}
 */
function extractBearerToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

// ── Test-only: reset the cached auth client ─────────────────────────────────
/** @internal */
export function _resetAuthClient() {
  _authClient = null;
  _tokenUserCache.clear();
}
