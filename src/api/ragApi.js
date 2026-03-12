import { resolveChatScope } from './chatScope.js';

const META_ENV = import.meta.env || {};
const RAG_API_BASE = META_ENV.VITE_RAG_API_BASE || '/api/rag';
const DEFAULT_TIMEOUT = Number(META_ENV.VITE_RAG_API_TIMEOUT || 30000);
export const DEFAULT_RAG_SUBJECT_CODE = META_ENV.VITE_DEFAULT_SUBJECT_CODE || '9709';
export const MISSING_CHAT_SCOPE_ERROR = 'Please specify the subject in your question or open chat from a subject page.';

function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

async function fetchWithTimeout(input, init = {}, timeout = DEFAULT_TIMEOUT, signal) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new DOMException('Timeout', 'AbortError')), timeout);
  const combinedSignal = signal ? new AbortController() : null;

  let finalSignal = controller.signal;
  if (signal) {
    // Merge signals: if either aborts, we abort
    signal.addEventListener('abort', () => controller.abort(signal.reason));
    finalSignal = controller.signal;
  }

  try {
    const resp = await fetch(input, { ...init, signal: finalSignal });
    return resp;
  } finally {
    clearTimeout(timeoutId);
  }
}

function formatError(error, fallbackMsg = '服务暂时不可用，请稍后重试。') {
  if (error?.name === 'AbortError') return new Error('请求超时或已取消');
  if (typeof error?.message === 'string') return new Error(error.message);
  return new Error(fallbackMsg);
}

function normalizeChatMessages(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map((message) => ({
      role: message?.role === 'assistant' ? 'assistant' : 'user',
      content: String(message?.content || '').trim(),
    }))
    .filter((message) => message.content.length > 0);
}

export function buildAskChatPayload(params = {}) {
  const normalizedMessages = normalizeChatMessages(params.messages);
  const latestUserIndex = [...normalizedMessages].map((message) => message.role).lastIndexOf('user');
  const latestUserMessage = latestUserIndex >= 0 ? normalizedMessages[latestUserIndex] : null;
  const conversationContext = latestUserIndex > 0
    ? normalizedMessages.slice(Math.max(0, latestUserIndex - 5), latestUserIndex)
    : [];

  let query = String(params.query || '').trim();
  if (latestUserMessage?.content) {
    query = latestUserMessage.content;
    if (conversationContext.length > 0) {
      const transcript = conversationContext
        .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
        .join('\n');
      query = `Conversation context:\n${transcript}\n\nLatest user question: ${latestUserMessage.content}`;
    }
  }

  const scope = resolveChatScope({
    ...params,
    messages: normalizedMessages,
    query,
  });

  return {
    query,
    subject_code: scope.subject_code,
    syllabus_node_id: scope.syllabus_node_id,
    lang: params.lang || 'en',
  };
}

export function normalizeAskChatResponse(response = {}) {
  const answer = String(response?.answer || response?.message || response?.content || '').trim();
  const evidence = Array.isArray(response?.evidence)
    ? response.evidence
    : Array.isArray(response?.citations)
      ? response.citations
      : Array.isArray(response?.sources)
        ? response.sources
        : [];

  return {
    answer,
    message: answer,
    content: answer,
    citations: evidence,
    sources: evidence,
    evidence,
    uncertain: Boolean(response?.uncertain),
    request_id: response?.request_id || null,
    retrieval_version: response?.retrieval_version || null,
  };
}

async function withRetry(fn, { retries = 2, baseDelay = 400 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      const delay = baseDelay * 2 ** attempt + Math.random() * 100;
      await sleep(delay);
      attempt += 1;
    }
  }
}

export function createRagApi() {
  return {
    async search(params = {}, options = {}) {
      const { signal } = options;
      const body = {
        q: params.q || '',
        subject_code: params.subject_code,
        paper_code: params.paper_code ?? null,
        topic_id: params.topic_id ?? null,
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
        lang: params.lang || 'en',
        min_similarity: typeof params.min_similarity !== 'undefined' ? params.min_similarity : undefined,
      };

      return withRetry(async () => {
        const resp = await fetchWithTimeout(`${RAG_API_BASE}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }, DEFAULT_TIMEOUT, signal);

        if (!resp.ok) {
          let errMsg = `HTTP ${resp.status}`;
          try {
            const e = await resp.json();
            errMsg = e?.message || e?.error || errMsg;
          } catch {}
          throw new Error(errMsg);
        }
        return resp.json();
      });
    },

    async chat(params = {}, options = {}) {
      const { signal } = options;
      const body = buildAskChatPayload(params);

      if (!body.syllabus_node_id) {
        throw new Error(MISSING_CHAT_SCOPE_ERROR);
      }

      return withRetry(async () => {
        const resp = await fetchWithTimeout(`${RAG_API_BASE}/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }, DEFAULT_TIMEOUT, signal);

        if (!resp.ok) {
          let errMsg = `HTTP ${resp.status}`;
          try {
            const e = await resp.json();
            errMsg = e?.message || e?.error || errMsg;
          } catch {}
          throw new Error(errMsg);
        }
        return normalizeAskChatResponse(await resp.json());
      });
    },
  };
}

export const ragApi = createRagApi();

export function normalizeRagItems(items = []) {
  return items.map((item) => ({
    ...item,
    content: item.content || item.snippet || '',
    source_type: item.source_type || 'note',
    title: item.title || '',
    subject_code: item.subject_code || null,
    paper_code: item.paper_code || null
  }));
}

export async function ragSearch(query, options = {}) {
  const {
    subject_code = DEFAULT_RAG_SUBJECT_CODE,
    paper_code = null,
    topic_id = null,
    match_count = 8,
    min_similarity = undefined,
    signal
  } = options;

  if (!query || !query.trim()) {
    return [];
  }

  try {
    const response = await ragApi.search({
      q: query,
      subject_code,
      paper_code,
      topic_id,
      page: 1,
      page_size: match_count,
      min_similarity
    }, { signal });

    return normalizeRagItems(response?.items || []);
  } catch (error) {
    // Keep UI behavior stable: search fallback returns empty list.
    console.error('RAG search error:', error);
    return [];
  }
}

export function shouldUseRAG(query) {
  const keywords = [
    'mathematics', 'physics', 'chemistry', 'biology',
    '数学', '物理', '化学', '生物',
    'question', 'problem', 'example', 'solution',
    '题目', '问题', '例题', '解答', '答案',
    'definition', 'formula', 'theorem', 'proof',
    '定义', '公式', '定理', '证明',
    'how to', 'explain', 'calculate', 'solve',
    '如何', '解释', '计算', '求解'
  ];

  const lowerQuery = String(query || '').toLowerCase();
  return keywords.some((keyword) => lowerQuery.includes(keyword));
}

export function formatRAGContext(results) {
  if (!results || results.length === 0) {
    return '';
  }

  const contextParts = results.map((result, index) => {
    const { content, source_type, title, subject_code, paper_code } = result;
    const source = `${subject_code}${paper_code ? ` ${paper_code}` : ''} - ${title}`;
    return `[参考资料 ${index + 1}] 来源: ${source} (${source_type})\n${content}`;
  });

  return `基于以下相关学习资料：\n\n${contextParts.join('\n\n')}\n\n`;
}

export async function enhanceMessageWithRAG(userMessage, options = {}) {
  if (!shouldUseRAG(userMessage)) {
    return userMessage;
  }

  try {
    const ragResults = await ragSearch(userMessage, options);
    if (ragResults.length === 0) {
      return userMessage;
    }

    const context = formatRAGContext(ragResults);
    return `${context}基于上述资料，请回答：${userMessage}`;
  } catch (error) {
    console.error('Error enhancing message with RAG:', error);
    return userMessage;
  }
}
