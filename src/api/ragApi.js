const RAG_API_BASE = import.meta.env.VITE_RAG_API_BASE || '/api/rag';
const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_RAG_API_TIMEOUT || 30000);

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
      const body = {
        messages: params.messages || [],
        subject_code: params.subject_code,
        paper_code: params.paper_code ?? null,
        topic_id: params.topic_id ?? null,
        lang: params.lang || 'en',
      };

      return withRetry(async () => {
        const resp = await fetchWithTimeout(`${RAG_API_BASE}/chat`, {
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
  };
}

export const ragApi = createRagApi();