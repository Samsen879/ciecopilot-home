export function buildUserMessage(content, timestamp = new Date().toLocaleTimeString()) {
  return {
    id: Date.now(),
    type: 'user',
    content: String(content || '').trim(),
    timestamp,
  };
}

export function appendUserMessage(history = [], content, timestamp = new Date().toLocaleTimeString()) {
  const normalizedHistory = Array.isArray(history) ? history : [];
  return [...normalizedHistory, buildUserMessage(content, timestamp)];
}

export function prepareRetry(messages = []) {
  const normalizedMessages = Array.isArray(messages) ? messages : [];
  const lastUserIndex = [...normalizedMessages].map((message) => message?.type).lastIndexOf('user');

  if (lastUserIndex < 0) {
    return {
      retryContent: null,
      history: normalizedMessages,
    };
  }

  return {
    retryContent: normalizedMessages[lastUserIndex]?.content || null,
    history: normalizedMessages.slice(0, lastUserIndex),
  };
}
