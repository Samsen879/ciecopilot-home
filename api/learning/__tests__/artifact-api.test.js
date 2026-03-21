import { jest } from '@jest/globals';

const mockPatchLearningArtifact = jest.fn();

jest.unstable_mockModule('../lib/artifacts/artifact-service.js', () => ({
  patchLearningArtifact: mockPatchLearningArtifact,
}));

const { default: handler } = await import('../artifacts/[id].js');

function createReq({
  method = 'PATCH',
  id = 'art-1',
  body = {},
  authUserId = 'student-1',
} = {}) {
  return {
    method,
    query: { id },
    body,
    request_id: 'req-artifact-api',
    auth_user_id: authUserId,
  };
}

function createRes() {
  const headers = {};

  return {
    statusCode: 200,
    headers,
    body: null,
    writableEnded: false,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.writableEnded = true;
      return this;
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('artifact api', () => {
  test('PATCH /api/learning/artifacts/:id enforces lifecycle transitions without duplicate truth', async () => {
    mockPatchLearningArtifact.mockResolvedValueOnce({
      artifact: {
        artifact_id: 'art-1',
        placement_status: 'pinned',
        lifecycle_status: 'active',
      },
      slot_transition: null,
    });

    const req = createReq({
      body: {
        intent: 'set_placement_status',
        placement_status: 'pinned',
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(mockPatchLearningArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'student-1',
        artifactId: 'art-1',
        intent: 'set_placement_status',
        placementStatus: 'pinned',
      }),
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.artifact).toMatchObject({
      placement_status: 'pinned',
      lifecycle_status: 'active',
    });
  });

  test('PATCH /api/learning/artifacts/:id rejects illegal transitions with artifact_state_conflict', async () => {
    const error = new Error('artifact_state_conflict');
    error.code = 'artifact_state_conflict';
    error.status = 409;
    error.publicMessage = 'The artifact state conflicts with this request.';
    mockPatchLearningArtifact.mockRejectedValueOnce(error);

    const req = createReq({
      id: 'art-contested',
      body: {
        intent: 'set_placement_status',
        placement_status: 'pinned',
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe('artifact_state_conflict');
  });

  test('PATCH /api/learning/artifacts/:id rejects generic state payloads', async () => {
    const req = createReq({
      body: {
        state: 'pinned',
      },
    });
    const res = createRes();

    await handler(req, res);

    expect(mockPatchLearningArtifact).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('invalid_payload');
  });
});
