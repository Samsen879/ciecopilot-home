import { jest } from '@jest/globals';
import { createSupabaseClientForEnv } from '../supabase.js';

describe('frontend Supabase configuration', () => {
  test('fails fast in production when frontend Supabase env vars are missing', () => {
    expect(() => createSupabaseClientForEnv({
      PROD: true,
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    })).toThrow('Missing Supabase frontend environment variables');
  });

  test('keeps the no-op client available outside production', () => {
    const createClientImpl = jest.fn();
    const client = createSupabaseClientForEnv({
      DEV: true,
      PROD: false,
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    }, {
      createClientImpl,
      logger: { warn: jest.fn() },
      storage: null,
    });

    expect(createClientImpl).not.toHaveBeenCalled();
    expect(client.auth.getSession).toBeDefined();
  });
});
