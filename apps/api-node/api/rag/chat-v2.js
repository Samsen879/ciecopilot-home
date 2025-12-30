/**
 * /api/rag/chat-v2.js
 *
 * RAG Chat endpoint with mandatory syllabus boundary enforcement.
 * Uses hybrid_search_v2 RPC which requires current_topic_path.
 *
 * **Feature: syllabus-boundary-system, PR-3: API Integration**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**
 */

import { createClient } from '@supabase/supabase-js';
import { createContextManager } from '../samsen/context/contextManager.js';
import { buildSamsenSystemPrompt } from '../samsen/context/systemPrompt.js';
import { getTokenizer } from '../samsen/utils/tokenizer.js';
import { buildMessages } from '../samsen/utils/messages.js';
import { recordTokens, recordCostUsd } from '../../middleware/metrics.js';
import {
  hybridSearchV2,
  formatEvidence,
  SyllabusSearchError,
  SyllabusSearchErrorCode,
} from '../services/syllabusSearch.js';

function getEnv() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  let SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_KEY) {
    SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  }
  const EMBEDDING_BASE_URL =
    process.env.VECTOR_EMBEDDING_BASE_URL ||
    process.env.EMBEDDING_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://api.openai.com/v1';
  const EMBEDDING_API_KEY =
    process.env.VECTOR_EMBEDDING_API_KEY ||
    process.env.EMBEDDING_API_KEY ||
    process.env.DASHSCOPE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_TOKEN ||
    process.env.OPENAI_KEY;
  const EMBEDDING_MODEL =
    process.env.VECTOR_EMBEDDING_MODEL || process.env.EMBEDDING_MODEL || 'text-embedding-3-large';
  const EMBEDDING_DIMENSIONS = 1536;
  const CHAT_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const CHAT_API_KEY =
    process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN || process.env.OPENAI_KEY;
  const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini';
  return {
    SUPABASE_URL,
    SUPABASE_KEY,
    EMBEDDING_BASE_URL,
    EMBEDDING_API_KEY,
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS,
    CHAT_BASE_URL,
    CHAT_API_KEY,
    CHAT_MODEL,
  };
}

function formatCitations(results) {
  return (results || []).map((r) => ({
    id: r.id,
    topic_path: String(r.topic_path || ''),
    snippet: (r.snippet || '').slice(0, 280),
    score: r.score,
    rank_sem: r.rank_sem,
    rank_key: r.rank_key,
  }));
}


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', message: 'Only POST' });
  }

  try {
    const env = getEnv();
    if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    if (!env.EMBEDDING_API_KEY) {
      return res.status(500).json({ error: 'Embedding API key not configured' });
    }

    const {
      messages: inputMessages = [],
      current_topic_path,
      subject_code,
      lang = 'en',
      top_k = 12,
      conversation_id = null,
      samsen_context = null,
    } = req.body || {};

    if (!Array.isArray(inputMessages) || inputMessages.length === 0) {
      return res.status(400).json({ error: 'messages is required', code: 'MESSAGES_REQUIRED' });
    }

    if (
      !current_topic_path ||
      (typeof current_topic_path === 'string' && current_topic_path.trim() === '')
    ) {
      return res.status(400).json({
        error: 'current_topic_path is required',
        code: SyllabusSearchErrorCode.TOPIC_PATH_REQUIRED,
      });
    }

    const lastUser = [...inputMessages].reverse().find((m) => m?.role === 'user');
    const question = String(lastUser?.content || '').slice(0, 4000);

    const embResp = await fetch(`${env.EMBEDDING_BASE_URL.replace(/\/$/, '')}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.EMBEDDING_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.EMBEDDING_MODEL,
        input: question || ' ',
        dimensions: env.EMBEDDING_DIMENSIONS,
      }),
    });

    if (!embResp.ok) {
      return res.status(502).json({ error: 'Embedding API Error' });
    }

    const embData = await embResp.json();
    const embedding = embData?.data?.[0]?.embedding;
    if (!embedding) {
      return res.status(500).json({ error: 'No embedding returned' });
    }

    let searchResults;
    try {
      searchResults = await hybridSearchV2({
        query: question,
        embedding,
        currentTopicPath: current_topic_path,
        matchCount: Number(top_k) || 12,
      });
    } catch (err) {
      if (err instanceof SyllabusSearchError) {
        if (err.code === SyllabusSearchErrorCode.TOPIC_LEAKAGE_DETECTED) {
          return res.status(500).json({
            error: 'Topic boundary invariant breach',
            code: err.code,
            incident_id: err.incidentId,
          });
        }
        return res.status(err.httpStatus).json({ error: err.message, code: err.code });
      }
      throw err;
    }

    const evidence = formatEvidence(searchResults);
    const citations = formatCitations(searchResults);

    const yamlBlocks = searchResults
      .map(
        (r) =>
          `---\nsource_id: ${r.id}\ntopic_path: ${r.topic_path}\nsnippet: |\n  ${(r.snippet || '').slice(0, 1000).replace(/\n/g, '\n  ')}\n---`
      )
      .join('\n\n');

    const contextText = `# Context Blocks\n${yamlBlocks}`;
    const highLevelSystem = buildSamsenSystemPrompt({
      samsen_context,
      subject_context: { subject_code: subject_code || current_topic_path.split('.')[0] },
      lang,
    });
    const taskPrompt = `You are a CIE A-Level study assistant. Current topic: ${current_topic_path}.`;
    const userPrompt = `Question: ${question}\n\nContext:\n${contextText}`;

    const ctxMgr = createContextManager({ namespace: 'samsen:rag:v2', ttl_sec: 86400 });
    const convId =
      conversation_id || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const history = await ctxMgr.loadHistory(convId);
    const trimmedHistory = ctxMgr.trimToBudget(history, `${highLevelSystem}\n${taskPrompt}`);
    const summary = ctxMgr.summarize(trimmedHistory, lang);

    const chatMessages = buildMessages({
      highLevelSystem,
      taskSystem: taskPrompt,
      summary,
      history: trimmedHistory,
      userMessage: userPrompt,
    });

    const chatResp = await fetch(`${env.CHAT_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: env.CHAT_MODEL, temperature: 0.3, messages: chatMessages }),
    });

    if (!chatResp.ok) {
      return res.status(502).json({ error: 'OpenAI API Error' });
    }

    const chatData = await chatResp.json();
    const answer = chatData?.choices?.[0]?.message?.content || '';

    try {
      const updated = [
        ...history,
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: answer },
      ];
      await ctxMgr.saveHistory(convId, updated);
    } catch {}

    return res.status(200).json({
      current_topic_path,
      subject_code: subject_code || current_topic_path.split('.')[0],
      lang,
      answer,
      evidence,
      citations,
      conversation_id: convId,
      usage: chatData?.usage || undefined,
    });
  } catch (err) {
    console.error('Unexpected error in RAG chat v2:', err);
    return res.status(500).json({ error: 'Internal server error', message: err?.message });
  }
}
