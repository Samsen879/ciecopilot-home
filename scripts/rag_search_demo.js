// Demo: perform hybrid/fulltext search using SQL functions with a text query
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// Load env vars from .env first, then .env.local to override if present
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config()
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true })

// Prefer service role for RPC (RLS-safe); fall back to anon for read-only envs
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY
// Embedding provider config (OpenAI-compatible; works with Qwen/DashScope)
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
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON for dev)')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function parseArgs(argv) {
  // Flexible usage:
  //   node scripts/rag_search_demo.js                            -> defaults
  //   node scripts/rag_search_demo.js 9702 "query"                -> subject + query
  //   node scripts/rag_search_demo.js 9702 AS "query"             -> subject + paper + query
  //   node scripts/rag_search_demo.js 9702 AS topic123 "query"    -> + topic
  //   Use '-' to skip paper/topic
  const args = argv.slice(2)
  const knownPapers = new Set(['AS', 'A2', 'paper1', 'paper2', 'paper3', 'paper4', 'paper5', 'paper6'])

  let subject_code = '9702'
  let paper_code = null
  let topic_id = null
  let q = 'electric field potential difference relationship'

  if (args.length >= 1) subject_code = args[0]

  if (args.length === 2) {
    // Could be paper or query
    if (knownPapers.has(args[1]) || args[1] === '-') {
      paper_code = args[1] === '-' ? null : args[1]
    } else {
      q = args[1]
    }
  } else if (args.length === 3) {
    if (knownPapers.has(args[1]) || args[1] === '-') {
      paper_code = args[1] === '-' ? null : args[1]
      q = args[2]
    } else {
      // Treat [subject, query-part1, query-part2]
      q = args.slice(1).join(' ')
    }
  } else if (args.length >= 4) {
    paper_code = args[1] === '-' ? null : args[1]
    topic_id = args[2] === '-' ? null : args[2]
    q = args.slice(3).join(' ')
  }

  return { subject_code, paper_code, topic_id, q }
}

async function main() {
  const { subject_code, paper_code, topic_id, q } = parseArgs(process.argv)

  // Try embedding if API key is configured; otherwise fallback to fulltext
  let embedding = null
  if (EMBEDDING_API_KEY) {
    try {
      const embResp = await fetch(`${EMBEDDING_BASE_URL.replace(/\/$/, '')}/embeddings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${EMBEDDING_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: q, ...(EMBEDDING_DIMENSIONS ? { dimensions: EMBEDDING_DIMENSIONS } : {}) }),
      })
      if (embResp.ok) {
        const emb = await embResp.json()
        embedding = emb?.data?.[0]?.embedding || null
      }
    } catch {}
  }

  let data, error
  if (embedding) {
    const resp = await supabase.rpc('rag_search_hybrid', {
      query_text: q,
      query_embedding: embedding,
      in_subject_code: subject_code,
      in_paper_code: paper_code,
      in_topic_id: topic_id,
      match_count: 8,
      weight_embedding: 0.65,
      weight_fulltext: 0.35,
    })
    data = resp.data; error = resp.error
  } else {
    const resp = await supabase.rpc('rag_search_fulltext', {
      query_text: q,
      in_subject_code: subject_code,
      in_paper_code: paper_code,
      in_topic_id: topic_id,
      match_count: 8,
    })
    data = resp.data; error = resp.error
  }
  if (error) throw error
  console.log(JSON.stringify({ query: q, results: data }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})



