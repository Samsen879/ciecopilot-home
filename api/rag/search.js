// /api/rag/search.js
import { createClient } from '@supabase/supabase-js'

// Helper: read required envs safely
function getEnv() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  // Server-side: NEVER read VITE_* service role keys. Only allow service role from server env.
  let SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
  // Development fallback: allow anon key if service role is not provided (reduced capabilities)
  if (!SUPABASE_KEY) {
    SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  }

  // Embedding provider config (OpenAI-compatible; works with DashScope)
  const EMBEDDING_BASE_URL =
    process.env.VECTOR_EMBEDDING_BASE_URL ||
    process.env.EMBEDDING_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://api.openai.com/v1'
  const EMBEDDING_API_KEY =
    process.env.VECTOR_EMBEDDING_API_KEY ||
    process.env.EMBEDDING_API_KEY ||
    process.env.DASHSCOPE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_TOKEN ||
    process.env.OPENAI_KEY
  const EMBEDDING_MODEL =
    process.env.VECTOR_EMBEDDING_MODEL ||
    process.env.EMBEDDING_MODEL ||
    'text-embedding-3-small'
  const EMBEDDING_DIMENSIONS = (() => {
    const v = process.env.VECTOR_EMBEDDING_DIMENSIONS || process.env.EMBEDDING_DIMENSIONS
    const n = v ? Number(v) : undefined
    return Number.isFinite(n) && n > 0 ? n : undefined
  })()

  return { SUPABASE_URL, SUPABASE_KEY, EMBEDDING_BASE_URL, EMBEDDING_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS }
}

function toHttpError(res, status = 500, userMessage = '服务暂时不可用，请稍后重试。') {
  return res.status(status).json({ error: 'Server error', message: userMessage, userMessage })
}

function buildItemsFromRows(rows, { lang = 'en' } = {}) {
  return (rows || []).map((r) => ({
    id: r.chunk_id,
    chunk_id: r.chunk_id,
    document_id: r.document_id,
    subject_code: r.subject_code || null,
    paper_code: r.paper_code || null,
    topic_id: r.topic_id || null,
    source_type: r.source_type || 'note',
    lang,
    page_from: r.page_from || null,
    page_to: r.page_to || null,
    path: r.source_path || null,
    title: r.title || '',
    snippet: (r.highlight || r.content || '').slice(0, 360),
    similarity: r.similarity ?? null,
    score: (r.score ?? r.similarity ?? null),
  }))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are supported',
      userMessage: '请求方法不支持，请联系技术支持。',
    })
  }

  try {
    const { SUPABASE_URL, SUPABASE_KEY, EMBEDDING_BASE_URL, EMBEDDING_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } = getEnv()
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Supabase credentials not configured (require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on server; ANON key allowed for dev only)',
        userMessage: '服务配置缺失，请联系技术支持。',
      })
    }
    const embeddingAvailable = Boolean(EMBEDDING_API_KEY)

    const {
      q = '',
      subject_code,
      paper_code = null,
      topic_id = null,
      page = 1,
      page_size = 20,
      lang = 'en',
      match_count, // optional override
      min_similarity, // optional override
    } = req.body || {}

    if (!subject_code) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'subject_code is required',
        userMessage: '请选择学科后再搜索。',
      })
    }

    // 1) If embedding is available, create embedding; else fallback to fulltext only
    let embedding = null
    let retries = 0
    if (embeddingAvailable) {
      const createEmbedding = async () => {
        const embResp = await fetch(`${EMBEDDING_BASE_URL.replace(/\/$/, '')}/embeddings`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${EMBEDDING_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: EMBEDDING_MODEL, input: String(q || '').slice(0, 2000), ...(EMBEDDING_DIMENSIONS ? { dimensions: EMBEDDING_DIMENSIONS } : {}) }),
        })
        if (!embResp.ok) {
          let msg = 'Failed to create embedding'
          try { const e = await embResp.json(); msg = e?.error?.message || msg } catch {}
          const status = embResp.status
          const isRetryable = status === 429 || (status >= 500 && status < 600)
          if (isRetryable && retries < 2) {
            retries += 1
            await new Promise((r) => setTimeout(r, 200 * 2 ** (retries - 1)))
            return createEmbedding()
          }
          return null
        }
        const embData = await embResp.json()
        return embData?.data?.[0]?.embedding || null
      }
      embedding = await createEmbedding()
    }

    // 2) Query Supabase RPC
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const count = Number(match_count || page_size || 20)
    const t0 = Date.now()
    let data, error
    let mode = 'fulltext'
    if (embedding) {
      // Hybrid search: embedding + fulltext (uses DB-side weighting)
      const { data: hd, error: he } = await supabase.rpc('rag_search_hybrid', {
        query_text: String(q || ''),
        query_embedding: embedding,
        in_subject_code: subject_code,
        in_paper_code: paper_code,
        in_topic_id: topic_id,
        match_count: count,
        weight_embedding: 0.65,
        weight_fulltext: 0.35,
      })
      data = hd; error = he; mode = 'hybrid'
    } else {
      // Fallback to fulltext only when embedding provider unavailable
      const { data: fd, error: fe } = await supabase.rpc('rag_search_fulltext', {
        query_text: String(q || ''),
        in_subject_code: subject_code,
        in_paper_code: paper_code,
        in_topic_id: topic_id,
        match_count: count,
      })
      data = fd; error = fe
    }
    const elapsed = Date.now() - t0
    if (error) {
      const code = (error?.code && Number(error.code)) || 500
      return res.status(code).json({ error: 'Database error', message: error.message || 'RPC rag_search_filtered failed', userMessage: '检索服务暂时不可用，请稍后重试。' })
    }

    // 3) Build response
    let items = buildItemsFromRows(data, { lang })
    // Optional threshold: only applies when embedding was used
    if (mode === 'hybrid' && typeof min_similarity !== 'undefined' && min_similarity !== null && min_similarity !== '') {
      const threshold = Number(min_similarity)
      if (Number.isFinite(threshold)) {
        items = items.filter((it) => typeof it.similarity === 'number' ? it.similarity >= threshold : true)
      }
    }
    // Ensure sorting by score desc
    items.sort((a, b) => (Number(b.score ?? -Infinity) - Number(a.score ?? -Infinity)))
    // fire-and-forget logging (best effort)
    try {
      const top = items?.[0]
      await supabase.rpc('rag_log_search', {
        in_user_id: null,
        in_query_text: String(q || ''),
        in_subject_code: subject_code,
        in_paper_code: paper_code,
        in_topic_id: topic_id,
        in_mode: mode,
        in_match_count: count,
        in_duration_ms: elapsed,
        in_top_score: (top?.score ?? top?.similarity ?? null),
        in_top_chunk_id: (top?.chunk_id || null),
        in_items: (items?.slice(0, 5) || []),
        in_degraded: (mode === 'fulltext'),
        in_retries: retries,
      })
    } catch {}
    const response = {
      query: q,
      subject_code,
      paper_code,
      topic_id,
      page,
      page_size,
      total: items.length,
      items,
      lang,
      elapsed_ms: elapsed,
      mode,
    }

    return res.status(200).json(response)
  } catch (err) {
    console.error('Unexpected error in RAG search:', err)
    // Handle network errors explicitly if possible
    if (err?.name === 'TypeError' && String(err.message || '').includes('fetch')) {
      return res.status(503).json({
        error: 'Network error',
        message: 'Failed to reach upstream services',
        userMessage: '网络连接问题，请检查网络后重试。',
      })
    }
    return res.status(500).json({ error: 'Internal server error', message: err?.message || 'An unexpected error occurred', userMessage: '系统遇到未知错误，请稍后重试或联系技术支持。' })
  }
}


