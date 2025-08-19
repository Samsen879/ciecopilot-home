// /api/rag/chat.js
import { createClient } from '@supabase/supabase-js'

function getEnv() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  // Server-side: NEVER read VITE_* service role keys. Only allow service role from server env.
  let SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
  // Development fallback: allow anon key if service role is not provided (reduced capabilities)
  if (!SUPABASE_KEY) {
    SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  }

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
  // Chat LLM config remains OpenAI-compatible for now
  const CHAT_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const CHAT_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN || process.env.OPENAI_KEY
  const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini'
  return { SUPABASE_URL, SUPABASE_KEY, EMBEDDING_BASE_URL, EMBEDDING_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, CHAT_BASE_URL, CHAT_API_KEY, CHAT_MODEL }
}

function formatCitations(rows) {
  return (rows || []).map((r) => ({
    document_id: r.document_id,
    subject_code: r.subject_code || null,
    paper_code: r.paper_code || null,
    topic_id: r.topic_id || null,
    source_type: r.source_type || 'note',
    lang: 'en',
    page_from: r.page_from || null,
    page_to: r.page_to || null,
    path: r.source_path || null,
    title: r.title || '',
    snippet: (r.content || '').slice(0, 280),
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
    const { SUPABASE_URL, SUPABASE_KEY, EMBEDDING_BASE_URL, EMBEDDING_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, CHAT_BASE_URL, CHAT_API_KEY, CHAT_MODEL } = getEnv()
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Supabase credentials not configured (require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on server; ANON key allowed for dev only)',
        userMessage: '服务配置缺失，请联系技术支持。',
      })
    }
    if (!EMBEDDING_API_KEY) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Embedding API key not configured',
        userMessage: 'AI服务暂时不可用，请稍后重试。',
      })
    }

    const {
      messages = [],
      subject_code,
      paper_code = null,
      topic_id = null,
      lang = 'en',
      top_k = 8,
      min_similarity = 0.25,
    } = req.body || {}

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request', message: 'messages is required', userMessage: '请输入有效的问题后再提交。' })
    }
    if (!subject_code) {
      return res.status(400).json({ error: 'Invalid request', message: 'subject_code is required', userMessage: '请选择学科后再提问。' })
    }

    // 1) Build a search query from last user message
    const lastUser = [...messages].reverse().find((m) => m?.role === 'user')
    const question = String(lastUser?.content || '').slice(0, 4000)

    // 2) Create query embedding
    const embResp = await fetch(`${EMBEDDING_BASE_URL.replace(/\/$/, '')}/embeddings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${EMBEDDING_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: question || ' ', ...(EMBEDDING_DIMENSIONS ? { dimensions: EMBEDDING_DIMENSIONS } : {}) }),
    })
    if (!embResp.ok) {
      let msg = 'Failed to create embedding'
      try { const e = await embResp.json(); msg = e?.error?.message || msg } catch {}
      return res.status(502).json({ error: 'Embedding API Error', message: msg, userMessage: 'AI服务暂时不可用，请稍后重试。' })
    }
    const embData = await embResp.json()
    const embedding = embData?.data?.[0]?.embedding
    if (!embedding) {
      return res.status(500).json({ error: 'Invalid response', message: 'No embedding returned by embedding provider', userMessage: 'AI服务异常，请稍后重试。' })
    }

    // 3) Retrieve top-k context from Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data: rows, error } = await supabase.rpc('rag_search_filtered', {
      query_embedding: embedding,
      in_subject_code: subject_code,
      in_paper_code: paper_code,
      in_topic_id: topic_id,
      match_count: Number(top_k),
      min_similarity: Number(min_similarity),
    })
    if (error) {
      const code = (error?.code && Number(error.code)) || 500
      return res.status(code).json({ error: 'Database error', message: error.message || 'RPC rag_search_filtered failed', userMessage: '检索服务暂时不可用，请稍后重试。' })
    }

    const citations = formatCitations(rows)
    const contextText = (rows || [])
      .map((r, i) => `# Source ${i + 1} [${r.source_type}] ${r.title}\n${(r.content || '').slice(0, 1200)}`)
      .join('\n\n')

    const systemPrompt = `You are a helpful CIE A-Level study assistant. Answer concisely using the provided context. If the answer is not in the context, say you are not sure and suggest next steps. Respond in ${lang}.`
    const userPrompt = `Question: ${question}\n\nContext:\n${contextText}`

    // 4) Generate answer
    const chatResp = await fetch(`${CHAT_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CHAT_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!chatResp.ok) {
      let msg = 'Failed to generate answer'
      try { const e = await chatResp.json(); msg = e?.error?.message || msg } catch {}
      return res.status(502).json({ error: 'OpenAI API Error', message: msg, userMessage: 'AI服务暂时不可用，请稍后重试。' })
    }
    const chatData = await chatResp.json()
    const answer = chatData?.choices?.[0]?.message?.content || ''

    return res.status(200).json({
      subject_code,
      paper_code,
      topic_id,
      lang,
      answer,
      citations,
      usage: chatData?.usage || undefined,
    })
  } catch (err) {
    console.error('Unexpected error in RAG chat:', err)
    if (err?.name === 'TypeError' && String(err.message || '').includes('fetch')) {
      return res.status(503).json({ error: 'Network error', message: 'Failed to reach upstream services', userMessage: '网络连接问题，请检查网络后重试。' })
    }
    return res.status(500).json({ error: 'Internal server error', message: err?.message || 'An unexpected error occurred', userMessage: '系统遇到未知错误，请稍后重试或联系技术支持。' })
  }
}


