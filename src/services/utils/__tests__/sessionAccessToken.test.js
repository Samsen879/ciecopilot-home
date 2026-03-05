import { requireSessionAccessToken } from '../sessionAccessToken.js';

describe('requireSessionAccessToken', () => {
  test('returns token when session is available', async () => {
    const token = 'token_abc';
    const authClient = {
      auth: {
        getSession: async () => ({ data: { session: { access_token: token } } })
      }
    };

    await expect(requireSessionAccessToken(authClient)).resolves.toBe(token);
  });

  test('throws when session is missing', async () => {
    const authClient = {
      auth: {
        getSession: async () => ({ data: { session: null } })
      }
    };

    await expect(requireSessionAccessToken(authClient)).rejects.toThrow('User not authenticated');
  });
});
