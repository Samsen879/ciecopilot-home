import { jest } from '@jest/globals';

const mockRequireSessionAccessToken = jest.fn();

jest.unstable_mockModule('../../utils/supabase.js', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.unstable_mockModule('../utils/sessionAccessToken.js', () => ({
  requireSessionAccessToken: mockRequireSessionAccessToken,
}));

const {
  createErrorBookItem,
  deleteErrorBookItem,
  listErrorBookItems,
  updateErrorBookItem,
} = await import('../errorBookService.js');

describe('errorBookService', () => {
  beforeEach(() => {
    mockRequireSessionAccessToken.mockReset();
    mockRequireSessionAccessToken.mockResolvedValue('token-123');
    global.fetch = jest.fn();
  });

  test('lists items through the manual-first Error Book endpoint', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        items: [
          {
            id: 'err-1',
            syllabus_code: '9709',
            paper: 1,
            topic: { id: 'topic-1', name: 'Functions' },
            question: 'Q1',
            created_at: '2026-03-02T00:00:00.000Z',
          },
        ],
        meta: {
          manual_first: true,
          auto_source_enabled: false,
        },
      }),
    });

    const result = await listErrorBookItems();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/error-book');
    expect(result.items[0].paper).toBe('Paper 1');
    expect(result.meta.auto_source_enabled).toBe(false);
  });

  test('sends authenticated create payload through the Error Book API', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({
        item: {
          id: 'err-2',
          syllabus_code: '9709',
          paper: 'Paper 1',
          question: 'Q2',
          created_at: '2026-03-02T00:00:00.000Z',
        },
      }),
    });

    await createErrorBookItem({
      question: 'Q2',
      topic_id: 'topic-2',
      source: 'manual',
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/error-book', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer token-123',
      }),
      body: JSON.stringify({
        question: 'Q2',
        topic_id: 'topic-2',
        source: 'manual',
      }),
    }));
  });

  test('updates and deletes individual Error Book items via item routes', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          item: {
            id: 'err-3',
            syllabus_code: '9709',
            paper: 'Paper 3',
            question: 'Q3',
            status: 'resolved',
            review_count: 4,
            created_at: '2026-03-02T00:00:00.000Z',
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          ok: true,
          deleted_id: 'err-3',
        }),
      });

    const updateResult = await updateErrorBookItem('err-3', {
      status: 'resolved',
      review_count: 4,
    });
    const deleteResult = await deleteErrorBookItem('err-3');

    expect(updateResult.item.status).toBe('resolved');
    expect(global.fetch.mock.calls[0][0]).toBe('/api/error-book/err-3');
    expect(global.fetch.mock.calls[0][1].method).toBe('PATCH');
    expect(global.fetch.mock.calls[1][0]).toBe('/api/error-book/err-3');
    expect(global.fetch.mock.calls[1][1].method).toBe('DELETE');
    expect(deleteResult.ok).toBe(true);
  });
});
