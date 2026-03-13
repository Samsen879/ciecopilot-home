import {
  appendUserMessage,
  prepareRetry,
} from '../chatHistory.js';

describe('chat history helpers', () => {
  test('prepareRetry removes trailing ai error and returns history before the last user message', () => {
    const messages = [
      { id: 1, type: 'ai', content: 'hello' },
      { id: 2, type: 'user', content: 'Explain momentum.' },
      { id: 3, type: 'ai', content: 'temporary failure', isError: true },
    ];

    expect(prepareRetry(messages)).toEqual({
      retryContent: 'Explain momentum.',
      history: [{ id: 1, type: 'ai', content: 'hello' }],
    });
  });

  test('appendUserMessage appends retry content without duplicating the previous user turn', () => {
    const history = [{ id: 1, type: 'ai', content: 'hello' }];
    const result = appendUserMessage(history, 'Explain momentum.', '10:00:00');

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      type: 'user',
      content: 'Explain momentum.',
      timestamp: '10:00:00',
    });
  });
});
