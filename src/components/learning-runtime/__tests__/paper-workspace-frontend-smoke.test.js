import fs from 'node:fs';
import { jest } from '@jest/globals';

import { buildWorkspaceViewModel } from '../view-models/workspace-view-model.js';

const mockRequireSessionAccessToken = jest.fn();
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
  },
};

jest.unstable_mockModule('../../../services/utils/sessionAccessToken.js', () => ({
  requireSessionAccessToken: mockRequireSessionAccessToken,
}));

jest.unstable_mockModule('../../../utils/supabase.js', () => ({
  supabase: mockSupabase,
}));

const {
  getPaperTopicSectionWorkspace,
  getPaperWorkspace,
  getWorkspace,
} = await import('../../../api/learningRuntimeApi.js');

const fixturesDir = new URL('../__fixtures__/paper-workspace-contract/', import.meta.url);

function readFixture(name) {
  return JSON.parse(fs.readFileSync(new URL(name, fixturesDir), 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertReviewQueueScope(payload, label) {
  if (!isObject(payload.review_queue) || typeof payload.review_queue.scope !== 'string') {
    throw new Error(`${label} payload missing review_queue.scope`);
  }
}

function assertCompatibility(payload, label) {
  if (!isObject(payload.compatibility) || typeof payload.compatibility.surface !== 'string') {
    throw new Error(`${label} payload missing compatibility`);
  }
}

function assertPaperWorkspacePayload(payload) {
  assertCompatibility(payload, 'paper workspace');
  assertReviewQueueScope(payload, 'paper workspace');

  if (!Array.isArray(payload.topic_sections)) {
    throw new Error('paper workspace payload malformed topic_sections');
  }
}

function assertPaperTopicSectionPayload(payload) {
  assertCompatibility(payload, 'paper topic-section');
  assertReviewQueueScope(payload, 'paper topic-section');

  if (!isObject(payload.topic_section)) {
    throw new Error('paper topic-section payload missing topic_section');
  }
}

function assertLegacyTopicWorkspacePayload(payload) {
  assertCompatibility(payload, 'legacy topic workspace');
  assertReviewQueueScope(payload, 'legacy topic workspace');

  if (!isObject(payload.workspace)) {
    throw new Error('legacy topic workspace payload missing workspace');
  }
}

function createJsonResponse(payload, { status = 200, statusText = 'OK' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => clone(payload),
  };
}

function createSmokeFetch(routes) {
  return jest.fn(async (url) => {
    const route = routes[url];

    if (!route) {
      throw new Error(`Unexpected smoke request: ${url}`);
    }

    if (route.validate) {
      route.validate(route.payload);
    }

    return createJsonResponse(route.payload, route);
  });
}

describe('paper workspace frontend smoke harness', () => {
  beforeEach(() => {
    mockRequireSessionAccessToken.mockResolvedValue('token-123');
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.fetch;
  });

  test('requests, parses, and view-models paper workspace route shapes without UI routes', async () => {
    global.fetch = createSmokeFetch({
      '/api/learning/workspaces/papers/9709%3Apaper%3Ap1': {
        payload: readFixture('paper-workspace-envelope.json'),
        validate: assertPaperWorkspacePayload,
      },
      '/api/learning/workspaces/papers/9709%3Apaper%3Ap1?topic_id=topic-1': {
        payload: readFixture('paper-topic-section-subview.json'),
        validate: assertPaperTopicSectionPayload,
      },
      '/api/learning/workspaces/topic-1': {
        payload: readFixture('legacy-topic-workspace-fallback.json'),
        validate: assertLegacyTopicWorkspacePayload,
      },
    });

    const paperPayload = await getPaperWorkspace('9709:paper:p1');
    const paperVm = buildWorkspaceViewModel(paperPayload);

    const topicSectionPayload = await getPaperTopicSectionWorkspace('9709:paper:p1', {
      topicId: 'topic-1',
    });
    const topicSectionVm = buildWorkspaceViewModel(topicSectionPayload);

    const legacyPayload = await getWorkspace('topic-1');
    const legacyVm = buildWorkspaceViewModel(legacyPayload);

    expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([
      '/api/learning/workspaces/papers/9709%3Apaper%3Ap1',
      '/api/learning/workspaces/papers/9709%3Apaper%3Ap1?topic_id=topic-1',
      '/api/learning/workspaces/topic-1',
    ]);
    expect(paperVm.surface).toEqual(expect.objectContaining({
      kind: 'paper_workspace',
      paperScope: '9709:paper:p1',
      reviewQueueScope: 'paper_workspace_review_projection',
      topicSectionsAreProjections: true,
      isPaperWorkspace: true,
    }));
    expect(paperVm.paperWorkspace.topicSections).toHaveLength(2);
    expect(topicSectionVm.surface).toEqual(expect.objectContaining({
      kind: 'paper_topic_section_workspace',
      paperScope: '9709:paper:p1',
      topicId: 'topic-1',
      reviewQueueScope: 'paper_topic_section_review_projection',
      isPaperTopicSection: true,
    }));
    expect(legacyVm.surface).toEqual(expect.objectContaining({
      kind: 'legacy_topic_workspace',
      paperScope: null,
      topicId: 'topic-1',
      reviewQueueScope: 'global_queue_projection',
      isLegacyTopicWorkspace: true,
    }));
  });

  test('degrades invalid paper scope responses as structured API errors', async () => {
    global.fetch = createSmokeFetch({
      '/api/learning/workspaces/papers/9709%3Ainvalid%20paper': {
        status: 400,
        statusText: 'Bad Request',
        payload: {
          error: {
            code: 'invalid_paper_scope',
            message: 'paperScope must be a canonical paper scope.',
            retryable: false,
            details: {
              paper_scope: '9709:invalid paper',
            },
          },
          request_id: 'req-invalid-paper-scope',
        },
      },
    });

    await expect(getPaperWorkspace('9709:invalid paper')).rejects.toMatchObject({
      name: 'LearningRuntimeApiError',
      status: 400,
      code: 'invalid_paper_scope',
      retryable: false,
      requestId: 'req-invalid-paper-scope',
      details: {
        paper_scope: '9709:invalid paper',
      },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/learning/workspaces/papers/9709%3Ainvalid%20paper',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
  });

  test.each([
    [
      'missing compatibility',
      () => {
        const payload = readFixture('paper-workspace-envelope.json');
        delete payload.compatibility;
        return payload;
      },
      /missing compatibility/,
    ],
    [
      'missing review_queue.scope',
      () => {
        const payload = readFixture('paper-workspace-envelope.json');
        delete payload.review_queue.scope;
        return payload;
      },
      /missing review_queue\.scope/,
    ],
    [
      'malformed topic_sections',
      () => ({
        ...readFixture('paper-workspace-envelope.json'),
        topic_sections: {
          section: 'not-an-array',
        },
      }),
      /malformed topic_sections/,
    ],
  ])('fails the local smoke stub for %s', async (_caseName, buildPayload, expectedError) => {
    global.fetch = createSmokeFetch({
      '/api/learning/workspaces/papers/9709%3Apaper%3Ap1': {
        payload: buildPayload(),
        validate: assertPaperWorkspacePayload,
      },
    });

    await expect(getPaperWorkspace('9709:paper:p1')).rejects.toThrow(expectedError);
  });
});
