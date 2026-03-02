import { RagError } from './errors.js';

function buildContext(evidence) {
  return evidence
    .map((item, idx) => `[#${idx + 1}] topic_path=${item.topic_path}\n${item.snippet}`)
    .join('\n\n');
}

export async function generateGroundedAnswer(
  {
    query,
    evidence,
    language = 'en',
    chatConfig,
  },
  {
    fetchImpl = fetch,
  } = {},
) {
  if (!chatConfig?.apiKey) {
    throw new RagError({
      status: 500,
      code: 'RAG_CHAT_KEY_MISSING',
      message: 'Chat API key is missing',
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('timeout'), chatConfig.timeoutMs || 18000);

  try {
    const response = await fetchImpl(`${chatConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chatConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: chatConfig.model,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You are a syllabus-bounded assistant. Use only provided evidence. If evidence is insufficient or conflicting, answer with uncertainty.',
          },
          {
            role: 'user',
            content: `Language: ${language}\nQuestion: ${query}\nEvidence:\n${buildContext(evidence)}`,
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      let message = 'Chat completion failed';
      try {
        const body = await response.json();
        message = body?.error?.message || message;
      } catch {
        // ignore
      }
      throw new RagError({
        status: 502,
        code: 'RAG_CHAT_UPSTREAM_ERROR',
        message,
      });
    }
    const payload = await response.json();
    return {
      answer: String(payload?.choices?.[0]?.message?.content || '').trim(),
      usage: payload?.usage || null,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new RagError({
        status: 504,
        code: 'RAG_CHAT_TIMEOUT',
        message: 'Chat completion timed out',
      });
    }
    if (error instanceof RagError) throw error;
    throw new RagError({
      status: 502,
      code: 'RAG_CHAT_NETWORK_ERROR',
      message: error?.message || 'Chat completion failed',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

