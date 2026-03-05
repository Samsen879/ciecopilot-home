// tests/evidence-ledger/auth-helper.test.js
// Unit tests for api/marking/lib/auth-helper.js
// Covers: resolveUserId, isLedgerEnabled, AuthError

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// ── Mock Supabase before importing the module under test ────────────────────
let mockGetUser;

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: (...args) => mockGetUser(...args),
    },
  }),
}));

// Dynamic import after mock setup (ESM requirement)
const {
  resolveUserId,
  isLedgerEnabled,
  AuthError,
  _resetAuthClient,
} = await import('../../api/marking/lib/auth-helper.js');

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeReq({ authorization, body = {} } = {}) {
  const headers = {};
  if (authorization !== undefined) headers.authorization = authorization;
  return { headers, body };
}

// ── Test suite ──────────────────────────────────────────────────────────────
describe('auth-helper', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    mockGetUser = jest.fn();
    _resetAuthClient();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ── isLedgerEnabled ─────────────────────────────────────────────────────
  describe('isLedgerEnabled()', () => {
    it('returns true when EVIDENCE_LEDGER_ENABLED=true', () => {
      process.env.EVIDENCE_LEDGER_ENABLED = 'true';
      expect(isLedgerEnabled()).toBe(true);
    });

    it('returns false when EVIDENCE_LEDGER_ENABLED=false', () => {
      process.env.EVIDENCE_LEDGER_ENABLED = 'false';
      expect(isLedgerEnabled()).toBe(false);
    });

    it('returns false when EVIDENCE_LEDGER_ENABLED is unset', () => {
      delete process.env.EVIDENCE_LEDGER_ENABLED;
      expect(isLedgerEnabled()).toBe(false);
    });

    it('returns false for non-"true" values like "1" or "yes"', () => {
      process.env.EVIDENCE_LEDGER_ENABLED = '1';
      expect(isLedgerEnabled()).toBe(false);
      process.env.EVIDENCE_LEDGER_ENABLED = 'yes';
      expect(isLedgerEnabled()).toBe(false);
    });
  });

  // ── AuthError ───────────────────────────────────────────────────────────
  describe('AuthError', () => {
    it('has correct name and default status 401', () => {
      const err = new AuthError('test');
      expect(err.name).toBe('AuthError');
      expect(err.status).toBe(401);
      expect(err.message).toBe('test');
      expect(err instanceof Error).toBe(true);
    });

    it('accepts custom status', () => {
      const err = new AuthError('bad', 400);
      expect(err.status).toBe(400);
    });
  });

  // ── resolveUserId ───────────────────────────────────────────────────────
  describe('resolveUserId()', () => {
    describe('with valid JWT', () => {
      it('returns user_id from JWT when token is valid', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: { id: 'jwt-user-123' } },
          error: null,
        });

        const req = makeReq({ authorization: 'Bearer valid-token' });
        const result = await resolveUserId(req);

        expect(result).toEqual({ user_id: 'jwt-user-123', auth_source: 'jwt' });
        expect(mockGetUser).toHaveBeenCalledWith('valid-token');
      });

      it('works regardless of EVIDENCE_LEDGER_ENABLED value', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: { id: 'jwt-user-456' } },
          error: null,
        });

        process.env.EVIDENCE_LEDGER_ENABLED = 'false';
        const req = makeReq({ authorization: 'Bearer some-token' });
        const result = await resolveUserId(req);

        expect(result).toEqual({ user_id: 'jwt-user-456', auth_source: 'jwt' });
      });
    });

    describe('ledger disabled (legacy mode)', () => {
      beforeEach(() => {
        process.env.EVIDENCE_LEDGER_ENABLED = 'false';
      });

      it('falls back to body.user_id when no Authorization header', async () => {
        const req = makeReq({ body: { user_id: 'body-user-789' } });
        const result = await resolveUserId(req);

        expect(result).toEqual({ user_id: 'body-user-789', auth_source: 'body' });
        expect(mockGetUser).not.toHaveBeenCalled();
      });

      it('falls back to body.user_id when JWT is invalid', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'invalid token' },
        });

        const req = makeReq({
          authorization: 'Bearer bad-token',
          body: { user_id: 'fallback-user' },
        });
        const result = await resolveUserId(req);

        expect(result).toEqual({ user_id: 'fallback-user', auth_source: 'body' });
      });

      it('throws AuthError (400) when no JWT and no body.user_id', async () => {
        const req = makeReq({ body: {} });

        await expect(resolveUserId(req)).rejects.toThrow(AuthError);
        await expect(resolveUserId(req)).rejects.toMatchObject({ status: 400 });
      });
    });

    describe('ledger enabled (strict JWT mode)', () => {
      beforeEach(() => {
        process.env.EVIDENCE_LEDGER_ENABLED = 'true';
      });

      it('throws AuthError (401) when no Authorization header', async () => {
        const req = makeReq({ body: { user_id: 'should-be-ignored' } });

        await expect(resolveUserId(req)).rejects.toThrow(AuthError);
        await expect(resolveUserId(req)).rejects.toMatchObject({ status: 401 });
      });

      it('throws AuthError (401) when JWT is invalid', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'expired' },
        });

        const req = makeReq({ authorization: 'Bearer expired-token' });

        await expect(resolveUserId(req)).rejects.toThrow(AuthError);
        await expect(resolveUserId(req)).rejects.toMatchObject({
          status: 401,
          message: 'expired',
        });
      });

      it('does NOT fall back to body.user_id even if present', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: null },
          error: { message: 'bad token' },
        });

        const req = makeReq({
          authorization: 'Bearer bad',
          body: { user_id: 'should-not-use' },
        });

        await expect(resolveUserId(req)).rejects.toThrow(AuthError);
      });
    });

    describe('Authorization header parsing', () => {
      it('handles case-insensitive "Bearer" prefix', async () => {
        mockGetUser.mockResolvedValue({
          data: { user: { id: 'user-case' } },
          error: null,
        });

        const req = makeReq({ authorization: 'bearer my-token' });
        const result = await resolveUserId(req);

        expect(result.auth_source).toBe('jwt');
        expect(mockGetUser).toHaveBeenCalledWith('my-token');
      });

      it('ignores non-Bearer auth schemes', async () => {
        process.env.EVIDENCE_LEDGER_ENABLED = 'false';
        const req = makeReq({
          authorization: 'Basic dXNlcjpwYXNz',
          body: { user_id: 'basic-fallback' },
        });
        const result = await resolveUserId(req);

        expect(result).toEqual({ user_id: 'basic-fallback', auth_source: 'body' });
        expect(mockGetUser).not.toHaveBeenCalled();
      });

      it('handles empty Authorization header', async () => {
        process.env.EVIDENCE_LEDGER_ENABLED = 'false';
        const req = makeReq({
          authorization: '',
          body: { user_id: 'empty-header-fallback' },
        });
        const result = await resolveUserId(req);

        expect(result).toEqual({ user_id: 'empty-header-fallback', auth_source: 'body' });
      });
    });
  });
});
