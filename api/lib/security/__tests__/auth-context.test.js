import { jest } from '@jest/globals';

const getServiceClientMock = jest.fn();
const authenticateRequestMock = jest.fn();

jest.unstable_mockModule('../../supabase/client.js', () => ({
  getServiceClient: getServiceClientMock,
}));

jest.unstable_mockModule('../../../middleware/auth.js', () => ({
  authenticateRequest: authenticateRequestMock,
}));

const { resolveTrustedAuthContext } = await import('../auth-context.js');

describe('auth-context local test identity mapping', () => {
  beforeEach(() => {
    process.env.AUTH_LOCAL_TEST_MODE = 'true';
    getServiceClientMock.mockReset();
    authenticateRequestMock.mockReset();
  });

  afterEach(() => {
    delete process.env.AUTH_LOCAL_TEST_MODE;
    delete process.env.SUPABASE_URL;
  });

  test('reuses an existing auth.users-backed local test identity', async () => {
    const existingUser = {
      id: '6f6e1d8c-8e2b-4e66-8f26-b5cd83806e1a',
      email: 'student-1@example.test',
      user_metadata: { role: 'student' },
      app_metadata: { role: 'student' },
    };
    const listUsersMock = jest.fn().mockResolvedValue({
      data: {
        users: [existingUser],
        nextPage: null,
      },
      error: null,
    });
    const createUserMock = jest.fn();

    getServiceClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: listUsersMock,
          createUser: createUserMock,
        },
      },
    });

    const result = await resolveTrustedAuthContext({
      headers: {
        authorization: 'Bearer test-user:student-1:student',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      context: {
        userId: existingUser.id,
        role: 'student',
        source: 'local_test',
        user: expect.objectContaining({
          id: existingUser.id,
          email: existingUser.email,
        }),
      },
    });
    expect(listUsersMock).toHaveBeenCalledWith({ page: 1, perPage: 200 });
    expect(createUserMock).not.toHaveBeenCalled();
  });

  test('creates a stable auth.users-backed local test identity when missing', async () => {
    const createdUser = {
      id: '6d677b59-5f17-43fb-89af-a4b2ba7d91fd',
      email: 'student-1@example.test',
      user_metadata: { role: 'student', name: 'student-1' },
      app_metadata: { role: 'student', auth_source: 'local_test' },
    };
    const listUsersMock = jest.fn().mockResolvedValue({
      data: {
        users: [],
        nextPage: null,
      },
      error: null,
    });
    const createUserMock = jest.fn().mockResolvedValue({
      data: {
        user: createdUser,
      },
      error: null,
    });

    getServiceClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: listUsersMock,
          createUser: createUserMock,
        },
      },
    });

    const result = await resolveTrustedAuthContext({
      headers: {
        authorization: 'Bearer test-user:student-1:student',
      },
    });

    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'student-1@example.test',
        email_confirm: true,
        user_metadata: expect.objectContaining({
          role: 'student',
          name: 'student-1',
          auth_source: 'local_test',
        }),
        app_metadata: expect.objectContaining({
          role: 'student',
          auth_source: 'local_test',
        }),
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      context: {
        userId: createdUser.id,
        role: 'student',
        source: 'local_test',
      },
    });
  });

  test('falls back to a synthetic local test identity when the admin api is unavailable', async () => {
    getServiceClientMock.mockReturnValue({
      from: jest.fn(),
    });

    const result = await resolveTrustedAuthContext({
      headers: {
        authorization: 'Bearer test-user:student-1:student',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      context: {
        userId: 'student-1',
        role: 'student',
        source: 'local_test',
        user: expect.objectContaining({
          id: 'student-1',
          email: 'student-1@example.test',
        }),
      },
    });
  });

  test('still uses mocked admin provisioning for placeholder test hosts', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    const existingUser = {
      id: '99ab903e-46aa-4cfb-9317-cf09aae34d79',
      email: 'student-1@example.test',
      user_metadata: { role: 'student' },
      app_metadata: { role: 'student' },
    };
    const listUsersMock = jest.fn().mockResolvedValue({
      data: {
        users: [existingUser],
        nextPage: null,
      },
      error: null,
    });
    const createUserMock = jest.fn();

    getServiceClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: listUsersMock,
          createUser: createUserMock,
        },
      },
    });

    const result = await resolveTrustedAuthContext({
      headers: {
        authorization: 'Bearer test-user:student-1:student',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      context: {
        userId: existingUser.id,
        role: 'student',
        source: 'local_test',
      },
    });
    expect(listUsersMock).toHaveBeenCalledWith({ page: 1, perPage: 200 });
    expect(createUserMock).not.toHaveBeenCalled();
  });

  test('skips placeholder-host provisioning when the admin client is a real network client', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    let listUsersCalled = false;
    let createUserCalled = false;

    getServiceClientMock.mockReturnValue({
      auth: {
        admin: {
          async listUsers() {
            listUsersCalled = true;
            return { data: { users: [], nextPage: null }, error: null };
          },
          async createUser() {
            createUserCalled = true;
            return { data: { user: null }, error: null };
          },
        },
      },
    });

    const result = await resolveTrustedAuthContext({
      headers: {
        authorization: 'Bearer test-user:student-1:student',
      },
    });

    expect(result).toMatchObject({
      ok: true,
      context: {
        userId: 'student-1',
        role: 'student',
        source: 'local_test',
      },
    });
    expect(listUsersCalled).toBe(false);
    expect(createUserCalled).toBe(false);
  });
});
