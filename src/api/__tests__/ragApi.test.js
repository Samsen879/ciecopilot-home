import { jest } from '@jest/globals';

describe('ragApi chat compatibility adapter', () => {
  let createRagApi;
  let buildAskChatPayload;
  let normalizeAskChatResponse;

  beforeAll(async () => {
    ({ createRagApi, buildAskChatPayload, normalizeAskChatResponse } = await import('../ragApi.js'));
  });

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('builds ask payload from chat messages while preserving recent conversation context', () => {
    const payload = buildAskChatPayload({
      messages: [
        { role: 'assistant', content: 'Let us focus on momentum conservation.' },
        { role: 'user', content: 'Can you remind me of the core formula?' },
        { role: 'assistant', content: 'Use total momentum before equals after.' },
        { role: 'user', content: 'How does that apply to 9709 mechanics?' },
      ],
      subject_code: '9709',
      topic_id: '9709.M1.Momentum',
      lang: 'en',
    });

    expect(payload).toMatchObject({
      subject_code: '9709',
      syllabus_node_id: '9709.M1.Momentum',
      lang: 'en',
    });
    expect(payload.query).toContain('Conversation context');
    expect(payload.query).toContain('Assistant: Let us focus on momentum conservation.');
    expect(payload.query).toContain('User: Can you remind me of the core formula?');
    expect(payload.query).toContain('Latest user question: How does that apply to 9709 mechanics?');
  });

  test('falls back to subject-root boundary when legacy topic ids are not valid syllabus node ids', () => {
    const payload = buildAskChatPayload({
      messages: [{ role: 'user', content: 'Explain circular motion.' }],
      subject_code: '9702',
      topic_id: 'Motion in a Circle',
    });

    expect(payload.subject_code).toBe('9702');
    expect(payload.syllabus_node_id).toBe('9702');
  });

  test('posts chat requests through /api/rag/ask and returns current-response-compatible fields', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: 'Momentum is conserved in a closed system.',
        uncertain: false,
        evidence: [{ title: '9709 Mechanics', page_from: 3 }],
        request_id: 'req-123',
        retrieval_version: 'v-current',
      }),
    });

    const api = createRagApi();
    const response = await api.chat({
      messages: [
        { role: 'assistant', content: 'Previous answer' },
        { role: 'user', content: 'Explain conservation of momentum.' },
      ],
      subject_code: '9709',
      topic_id: '9709.M1.Momentum',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/rag/ask');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.subject_code).toBe('9709');
    expect(body.syllabus_node_id).toBe('9709.M1.Momentum');
    expect(body.query).toContain('Latest user question: Explain conservation of momentum.');

    expect(response).toMatchObject({
      answer: 'Momentum is conserved in a closed system.',
      message: 'Momentum is conserved in a closed system.',
      content: 'Momentum is conserved in a closed system.',
      citations: [{ title: '9709 Mechanics', page_from: 3 }],
      sources: [{ title: '9709 Mechanics', page_from: 3 }],
      request_id: 'req-123',
      retrieval_version: 'v-current',
    });
  });

  test('normalizes ask responses into legacy chat-compatible shape', () => {
    const response = normalizeAskChatResponse({
      answer: 'Use integration by parts.',
      evidence: [{ title: '9709 Pure 3' }],
      request_id: 'req-xyz',
      retrieval_version: 'v-test',
      uncertain: false,
    });

    expect(response).toEqual({
      answer: 'Use integration by parts.',
      message: 'Use integration by parts.',
      content: 'Use integration by parts.',
      citations: [{ title: '9709 Pure 3' }],
      sources: [{ title: '9709 Pure 3' }],
      evidence: [{ title: '9709 Pure 3' }],
      uncertain: false,
      request_id: 'req-xyz',
      retrieval_version: 'v-test',
    });
  });
});
