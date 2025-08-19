// RAG ingestion script: register documents, chunk, embed, and upsert into DB
// Usage:
//   node scripts/rag_ingest.js --subject 9702 --papers AS,A2 --notes --pdf --limit 50 --dry
// Env:
//   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY), OPENAI_API_KEY

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env first, then .env.local to override if present
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

// Robust CLI argument parser: supports --key value, --key=value, -k value, and positional args in _
function parseCliArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        const key = a.slice(2, eq);
        const val = a.slice(eq + 1);
        out[key] = val === '' ? true : val;
      } else {
        const key = a.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith('-')) { out[key] = next; i++; }
        else { out[key] = true; }
      }
    } else if (a.startsWith('-')) {
      const key = a.slice(1);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) { out[key] = next; i++; }
      else { out[key] = true; }
    } else {
      if (!out._) out._ = [];
      out._.push(a);
    }
  }
  return out;
}

// Replace previous naive parser
const argv = parseCliArgs(process.argv.slice(2));
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL;
// Prefer service role for writes with RLS on. Fallback to anon for local/dev if you loosen policies.
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
// Embedding provider config (supports OpenAI-compatible endpoints like DashScope)
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
  process.env.VECTOR_EMBEDDING_MODEL ||
  process.env.EMBEDDING_MODEL ||
  'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = (() => {
  const v = process.env.VECTOR_EMBEDDING_DIMENSIONS || process.env.EMBEDDING_DIMENSIONS
  const n = v ? Number(v) : undefined
  return Number.isFinite(n) && n > 0 ? n : undefined
})()

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Missing Supabase credentials. Provide VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE / VITE_SUPABASE_SERVICE_ROLE_KEY / *ANON_KEY for dev)'
  );
}
if (!EMBEDDING_API_KEY) {
  throw new Error('Missing embedding API key. Provide VECTOR_EMBEDDING_API_KEY (or EMBEDDING_API_KEY / DASHSCOPE_API_KEY / OPENAI_API_KEY).');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Directories
const ROOT = path.join(__dirname, '..');
const NOTES_DIR = path.join(ROOT, 'src', 'data', 'data-notes');
const PAPERS_DIR = path.join(ROOT, 'data', 'past-papers');
const MARK_SCHEMES_DIR = path.join(ROOT, 'data', 'mark-schemes');

function hashString(s) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

function listFilesRecursive(baseDir, exts) {
  const results = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (exts.includes(path.extname(entry.name).toLowerCase())) results.push(full);
    }
  }
  if (fs.existsSync(baseDir)) walk(baseDir);
  return results;
}

function normalizeSubjectFromPath(p) {
  if (p.includes('9709')) return '9709';
  if (p.includes('9231')) return '9231';
  if (p.includes('9702')) return '9702';
  return 'unknown';
}

function inferPaperCodeFromPath(p) {
  // Notes: may include AS/A2 or paperX in filename
  const lower = p.toLowerCase();
  if (lower.includes('paper1')) return 'paper1';
  if (lower.includes('paper2')) return 'paper2';
  if (lower.includes('paper3')) return 'paper3';
  if (lower.includes('paper4')) return 'paper4';
  if (lower.includes('paper5')) return 'paper5';
  if (lower.includes('paper6')) return 'paper6';
  if (lower.includes('as')) return 'AS';
  if (lower.includes('a2')) return 'A2';
  return null;
}

/**
 * 解析试卷文件名，提取详细的元数据信息
 * 支持格式: 9702_s23_qp_12.pdf, 9702_s23_ms_12.pdf
 * @param {string} filePath - 文件路径
 * @returns {Object} 解析后的元数据
 */
function parseExamPaperMetadata(filePath) {
  const fileName = path.basename(filePath, '.pdf');
  const isMarkScheme = filePath.toLowerCase().includes('mark-schemes') || fileName.toLowerCase().includes('_ms_');
  const isPastPaper = filePath.toLowerCase().includes('past-papers') || fileName.toLowerCase().includes('_qp_');
  
  // 试卷文件名格式解析: 9702_s23_qp_12.pdf 或 9702_s23_ms_12.pdf
  const examPattern = /^(\d{4})_([swm])(\d{2})_(qp|ms)_(\d{1,2})$/i;
  const match = fileName.match(examPattern);
  
  if (match) {
    const [, subjectCode, session, year, paperType, paperNumber] = match;
    
    // 解析考试季
    const sessionMap = {
      's': 'summer',    // 夏季
      'w': 'winter',    // 冬季
      'm': 'march'      // 三月
    };
    
    // 解析年份 (23 -> 2023)
    const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
    
    // 生成paper_code
    const paperCode = `paper${paperNumber}`;
    
    return {
      subject_code: subjectCode,
      paper_code: paperCode,
      year: fullYear,
      session: sessionMap[session.toLowerCase()] || session,
      paper_number: parseInt(paperNumber),
      paper_type: paperType.toLowerCase(), // 'qp' 或 'ms'
      source_type: isMarkScheme ? 'mark_scheme_pdf' : 'past_paper_pdf',
      is_mark_scheme: isMarkScheme,
      is_past_paper: isPastPaper,
      original_filename: fileName,
      // 生成唯一的paper_id用于关联试卷和答案
      paper_id: `${subjectCode}_${session}${year}_${paperNumber}`
    };
  }
  
  // 回退到原有逻辑
  const subject_code = normalizeSubjectFromPath(filePath);
  const paper_code = inferPaperCodeFromPath(filePath);
  
  return {
    subject_code,
    paper_code,
    year: null,
    session: null,
    paper_number: null,
    paper_type: null,
    source_type: isMarkScheme ? 'mark_scheme_pdf' : 'past_paper_pdf',
    is_mark_scheme: isMarkScheme,
    is_past_paper: isPastPaper,
    original_filename: fileName,
    paper_id: null
  };
}

async function extractPdfText(filePath) {
  // Lazily import pdf-parse so that running notes-only ingestion doesn't require PDF test assets
  const pdf = (await import('pdf-parse')).default;
  const data = await pdf(fs.readFileSync(filePath));
  // Simple page split approximation; pdf-parse returns text merged, not per page.
  // As a minimal viable approach, split by form feed or by \n\n\n.
  const pages = data.text.split(/\f|\n\n\n/g).map((t) => t.trim()).filter(Boolean);
  return pages;
}

function chunkTextByTokens(text, targetTokens = 600, overlapTokens = 80) {
  const words = text.split(/\s+/);
  const approxTokens = (w) => Math.ceil(w.length * 0.75);
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    let end = start;
    let tokens = 0;
    while (end < words.length && tokens < targetTokens) {
      tokens += approxTokens(words[end]);
      end += 1;
    }
    const content = words.slice(start, end).join(' ');
    chunks.push(content);
    if (end >= words.length) break;
    start = Math.max(end - Math.ceil(overlapTokens / 1.0), start + 1);
  }
  return chunks;
}

// 新增：简单的sleep工具，用于节流和退避等待
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedBatch(texts) {
  // Determine provider-specific batch limits. DashScope/Qwen supports up to 10 items per request.
  const lowerBase = (EMBEDDING_BASE_URL || '').toLowerCase();
  const lowerModel = (EMBEDDING_MODEL || '').toLowerCase();
  const envBatch = Number(process.env.VECTOR_EMBEDDING_BATCH_SIZE || process.env.EMBEDDING_BATCH_SIZE);
  const maxBatchSize = Number.isFinite(envBatch) && envBatch > 0
    ? envBatch
    : (lowerBase.includes('dashscope') || lowerModel.includes('qwen') || lowerModel.includes('text-embedding-v4'))
      ? 10
      : 2048; // OpenAI-compatible default

  // 节流与重试配置（可通过环境变量覆盖）
  const throttleMsRaw = process.env.VECTOR_EMBEDDING_THROTTLE_MS || process.env.EMBEDDING_THROTTLE_MS;
  const throttleMs = Number.isFinite(Number(throttleMsRaw)) ? Number(throttleMsRaw)
    : (lowerBase.includes('dashscope') || lowerModel.includes('qwen') || lowerModel.includes('text-embedding-v4'))
      ? 400
      : 0; // 默认对DashScope做适度节流
  const maxRetriesRaw = process.env.VECTOR_EMBEDDING_MAX_RETRIES || process.env.EMBEDDING_MAX_RETRIES;
  const maxRetries = Number.isFinite(Number(maxRetriesRaw)) && Number(maxRetriesRaw) >= 0 ? Number(maxRetriesRaw) : 4;
  const baseDelayRaw = process.env.VECTOR_EMBEDDING_RETRY_BASE_MS || process.env.EMBEDDING_RETRY_BASE_MS;
  const baseDelayMs = Number.isFinite(Number(baseDelayRaw)) && Number(baseDelayRaw) > 0 ? Number(baseDelayRaw) : 500;

  const shouldRetry = (status, err) => {
    if (!status) return true; // 网络错误
    if ([429, 502, 503, 504].includes(status)) return true; // 常见限流/网关错误
    if (status >= 500 && status < 600) return true; // 其他5xx
    return false;
  };

  const results = [];
  for (let start = 0; start < texts.length; start += maxBatchSize) {
    const slice = texts.slice(start, start + maxBatchSize);

    let attempt = 0;
    while (true) {
      try {
        const resp = await fetch(`${EMBEDDING_BASE_URL.replace(/\/$/, '')}/embeddings`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${EMBEDDING_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: EMBEDDING_MODEL, input: slice, ...(EMBEDDING_DIMENSIONS ? { dimensions: EMBEDDING_DIMENSIONS } : {}) }),
        });

        if (!resp.ok) {
          let msg = `Embedding request failed with status ${resp.status}`;
          let detail = '';
          try { const e = await resp.json(); detail = e?.error?.message || e?.message || ''; } catch {}
          if (shouldRetry(resp.status)) {
            attempt += 1;
            if (attempt > maxRetries) {
              throw new Error(`${msg}${detail ? `: ${detail}` : ''} (exceeded retries)`);
            }
            const backoff = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 120;
            await sleep(backoff);
            continue; // 重试
          }
          // 不可重试的错误
          throw new Error(detail ? `${msg}: ${detail}` : msg);
        }

        const data = await resp.json();
        const arr = Array.isArray(data?.data) ? data.data : [];
        const embeddings = arr.map((d) => d.embedding);
        if (embeddings.length !== slice.length) {
          throw new Error(`Embedding response count ${embeddings.length} does not match request count ${slice.length}`);
        }
        results.push(...embeddings);
        break; // 成功，退出重试循环
      } catch (err) {
        // 网络级错误（fetch失败等）
        attempt += 1;
        if (attempt > maxRetries) {
          throw new Error(`Embedding request failed after ${maxRetries} retries: ${err?.message || err}`);
        }
        const backoff = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 120;
        await sleep(backoff);
      }
    }

    if (throttleMs > 0 && (start + maxBatchSize) < texts.length) {
      await sleep(throttleMs);
    }
  }
  return results;
}

async function upsertDocument({ subject_code, paper_code, topic_id, title, source_type, source_path, language = 'zh', tags = [] }) {
  const { data, error } = await supabase
    .from('rag_documents')
    .upsert({ subject_code, paper_code, topic_id, title, source_type, source_path, language, tags }, { onConflict: 'subject_code,paper_code,source_type,source_path' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function upsertChunk({ document_id, chunk_index, content, token_count = null, page_from = null, page_to = null, extra = {} }) {
  const { data, error } = await supabase
    .from('rag_chunks')
    .upsert({ document_id, chunk_index, content, token_count, page_from, page_to, extra }, { onConflict: 'document_id,chunk_index' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function upsertEmbedding({ chunk_id, embedding }) {
  const { data, error } = await supabase
    .from('rag_embeddings')
    .upsert({ chunk_id, embedding }, { onConflict: 'chunk_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function ingestMarkdownNotes({ subjectFilter, paperFilter, limit = Infinity, dryRun = false }) {
  const noteFiles = listFilesRecursive(NOTES_DIR, ['.md']).filter((p) => /9702|9709|9231/.test(p));
  console.log(`Found ${noteFiles.length} markdown files with subject pattern`);
  
  let count = 0;
  for (const file of noteFiles) {
    if (count >= limit) break;
    const subject_code = normalizeSubjectFromPath(file);
    console.log(`File: ${file}, Subject: ${subject_code}, Filter: ${subjectFilter}`);
    
    if (subjectFilter && subject_code !== subjectFilter) {
      console.log(`  Skipping: subject mismatch (${subject_code} !== ${subjectFilter})`);
      continue;
    }
    
    const paper_code = inferPaperCodeFromPath(file);
    if (paperFilter && paper_code !== paperFilter) {
      console.log(`  Skipping: paper mismatch (${paper_code} !== ${paperFilter})`);
      continue;
    }

    const title = path.basename(file, path.extname(file)).replace(/[_-]+/g, ' ');
    const source_type = 'note_md';
    const source_path = path.relative(ROOT, file).replace(/\\/g, '/');
    const topic_id = `${subject_code}-${hashString(source_path).slice(0, 8)}`;
    const content = fs.readFileSync(file, 'utf8');

    const chunks = chunkTextByTokens(content, 600, 100);
    if (chunks.length === 0) {
      console.log(`  Skipping: no content chunks generated`);
      continue;
    }

    console.log(`[notes] ${file} -> ${chunks.length} chunks`);
    if (dryRun) { count += 1; continue; }

    try {
      console.log(`  Upserting document...`);
      const doc = await upsertDocument({ subject_code, paper_code, topic_id, title, source_type, source_path, language: 'zh' });
      console.log(`  Document upserted: ${doc.id}`);
      
      console.log(`  Generating embeddings for ${chunks.length} chunks...`);
      const embeddings = await embedBatch(chunks);
      console.log(`  Embeddings generated: ${embeddings.length}`);
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`  Upserting chunk ${i + 1}/${chunks.length}...`);
        const chunk = await upsertChunk({ document_id: doc.id, chunk_index: i, content: chunks[i], token_count: null, extra: { kind: 'md' } });
        console.log(`  Chunk upserted: ${chunk.id}`);
        
        console.log(`  Upserting embedding for chunk ${chunk.id}...`);
        await upsertEmbedding({ chunk_id: chunk.id, embedding: embeddings[i] });
        console.log(`  Embedding upserted for chunk ${chunk.id}`);
      }
      console.log(`  ✅ Successfully processed file: ${file}`);
    } catch (error) {
      console.error(`  ❌ Error processing file ${file}:`, error.message);
      throw error;
    }
    count += 1;
  }
  console.log(`Processed ${count} files total`);
}

async function ingestPdfs({ subjectFilter, paperFilter, limit = 30, dryRun = false }) {
  const pdfDirs = [PAPERS_DIR, MARK_SCHEMES_DIR];
  let count = 0;
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  console.log(`\n🚀 开始PDF批量处理...`);
  console.log(`📁 扫描目录: ${pdfDirs.map(d => path.relative(ROOT, d)).join(', ')}`);
  console.log(`🎯 筛选条件: 科目=${subjectFilter || '全部'}, 试卷=${paperFilter || '全部'}`);
  console.log(`📊 处理限制: ${limit} 个文件`);
  console.log(`🔍 模式: ${dryRun ? 'DRY RUN (仅预览)' : '实际处理'}\n`);
  
  for (const base of pdfDirs) {
    const files = listFilesRecursive(base, ['.pdf']);
    console.log(`📂 在 ${path.relative(ROOT, base)} 中找到 ${files.length} 个PDF文件`);
    
    for (const file of files) {
      if (count >= limit) break;
      
      try {
        // 使用新的元数据解析函数
        const metadata = parseExamPaperMetadata(file);
        const { subject_code, paper_code, source_type, year, session, paper_number, paper_type, paper_id, original_filename } = metadata;
        
        // 应用筛选条件
        if (subjectFilter && subject_code !== subjectFilter) {
          skipped++;
          continue;
        }
        if (paperFilter && paper_code !== paperFilter) {
          skipped++;
          continue;
        }

        // 生成增强的标题和标签
        const title = year && session && paper_number 
          ? `${subject_code} ${year} ${session} Paper ${paper_number} ${paper_type === 'ms' ? '(Mark Scheme)' : '(Question Paper)'}`
          : original_filename;
        
        const tags = [
          subject_code,
          paper_code,
          year ? year.toString() : null,
          session,
          paper_type,
          source_type
        ].filter(Boolean);
        
        const source_path = path.relative(ROOT, file).replace(/\\/g, '/');
        const topic_id = null;

        console.log(`\n📄 处理文件 [${count + 1}/${limit}]: ${path.basename(file)}`);
        console.log(`   📋 元数据: ${subject_code} | ${year || 'N/A'} ${session || 'N/A'} | Paper ${paper_number || 'N/A'} | ${paper_type || 'N/A'}`);
        console.log(`   🏷️  类型: ${source_type}`);
        console.log(`   🆔 Paper ID: ${paper_id || 'N/A'}`);

        const pages = await extractPdfText(file);
        const chunks = pages.flatMap((pageText, idx) => {
          const sub = chunkTextByTokens(pageText, 500, 60);
          return sub.map((txt) => ({ txt, page: idx + 1 }));
        });
        
        if (chunks.length === 0) {
          console.log(`   ⚠️  警告: 无法提取文本内容，跳过`);
          skipped++;
          continue;
        }

        console.log(`   📝 提取内容: ${pages.length} 页 -> ${chunks.length} 个文本块`);
        
        if (dryRun) { 
          console.log(`   ✅ DRY RUN: 模拟处理完成`);
          count += 1; 
          continue; 
        }

        // 创建文档记录，包含增强的元数据
         const docData = {
           subject_code,
           paper_code,
           topic_id,
           title,
           source_type,
           source_path,
           language: 'en',
           tags
         };
        
        const doc = await upsertDocument(docData);
        console.log(`   💾 文档已保存: ID=${doc.id}`);
        
        // 批量处理嵌入
        console.log(`   🔄 生成向量嵌入...`);
        const embeddings = await embedBatch(chunks.map((c) => c.txt));
        
        console.log(`   📤 上传文本块和嵌入...`);
        for (let i = 0; i < chunks.length; i++) {
          const { txt, page } = chunks[i];
          const chunkExtra = {
             kind: 'pdf',
             year,
             session,
             paper_number,
             paper_type,
             paper_id,
             original_filename
           };
          const chunk = await upsertChunk({ 
            document_id: doc.id, 
            chunk_index: i, 
            content: txt, 
            page_from: page, 
            page_to: page, 
            extra: chunkExtra 
          });
          await upsertEmbedding({ chunk_id: chunk.id, embedding: embeddings[i] });
        }
        
        processed++;
        count += 1;
        console.log(`   ✅ 处理完成: ${chunks.length} 个块已保存`);
        
      } catch (error) {
        console.error(`   ❌ 处理失败: ${error.message}`);
        errors++;
        // 继续处理下一个文件
      }
    }
  }
  
  // 输出处理统计
  console.log(`\n📊 处理统计:`);
  console.log(`   ✅ 成功处理: ${processed} 个文件`);
  console.log(`   ⏭️  跳过文件: ${skipped} 个文件`);
  console.log(`   ❌ 处理失败: ${errors} 个文件`);
  console.log(`   📈 总计扫描: ${processed + skipped + errors} 个文件`);
  
  if (dryRun) {
    console.log(`\n🔍 DRY RUN 模式完成，实际未写入数据库`);
  } else {
    console.log(`\n🎉 PDF批量处理完成！`);
  }
}

/**
 * 检查文档是否已存在于数据库中
 * @param {Object} metadata - 文档元数据
 * @returns {Promise<boolean>} 是否已存在
 */
async function checkDocumentExists({ subject_code, paper_code, source_type, source_path }) {
  const { data, error } = await supabase
    .from('rag_documents')
    .select('id')
    .eq('subject_code', subject_code)
    .eq('paper_code', paper_code || '')
    .eq('source_type', source_type)
    .eq('source_path', source_path)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.warn(`检查文档存在性时出错: ${error.message}`);
    return false;
  }
  
  return !!data;
}

/**
 * 增强的PDF批量处理函数，支持断点续传和错误恢复
 */
async function ingestPdfsEnhanced({ subjectFilter, paperFilter, limit = 30, dryRun = false, skipExisting = true, continueOnError = true }) {
  const pdfDirs = [PAPERS_DIR, MARK_SCHEMES_DIR];
  let count = 0;
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let existingSkipped = 0;
  
  console.log(`\n🚀 开始增强PDF批量处理...`);
  console.log(`📁 扫描目录: ${pdfDirs.map(d => path.relative(ROOT, d)).join(', ')}`);
  console.log(`🎯 筛选条件: 科目=${subjectFilter || '全部'}, 试卷=${paperFilter || '全部'}`);
  console.log(`📊 处理限制: ${limit} 个文件`);
  console.log(`🔍 模式: ${dryRun ? 'DRY RUN (仅预览)' : '实际处理'}`);
  console.log(`⏭️  跳过已存在: ${skipExisting ? '是' : '否'}`);
  console.log(`🔄 错误继续: ${continueOnError ? '是' : '否'}\n`);
  
  // 收集所有PDF文件
  const allFiles = [];
  for (const base of pdfDirs) {
    const files = listFilesRecursive(base, ['.pdf']);
    allFiles.push(...files.map(file => ({ file, base })));
  }
  
  console.log(`📂 总共找到 ${allFiles.length} 个PDF文件`);
  
  for (const { file, base } of allFiles) {
    if (count >= limit) {
      console.log(`\n⏹️  达到处理限制 (${limit})，停止处理`);
      break;
    }
    
    try {
      // 使用新的元数据解析函数
      const metadata = parseExamPaperMetadata(file);
      const { subject_code, paper_code, source_type, year, session, paper_number, paper_type, paper_id, original_filename } = metadata;
      
      // 应用筛选条件
      if (subjectFilter && subject_code !== subjectFilter) {
        skipped++;
        continue;
      }
      if (paperFilter && paper_code !== paperFilter) {
        skipped++;
        continue;
      }

      // 检查是否已存在（如果启用跳过已存在）
      if (skipExisting && !dryRun) {
        const exists = await checkDocumentExists({
           subject_code,
           paper_code,
           source_type,
           source_path: path.relative(ROOT, file).replace(/\\/g, '/')
         });
        
        if (exists) {
          console.log(`\n⏭️  跳过已存在 [${count + 1}]: ${path.basename(file)}`);
          existingSkipped++;
          count++;
          continue;
        }
      }

      // 生成增强的标题和标签
      const title = year && session && paper_number 
        ? `${subject_code} ${year} ${session} Paper ${paper_number} ${paper_type === 'ms' ? '(Mark Scheme)' : '(Question Paper)'}`
        : original_filename;
      
      const tags = [
        subject_code,
        paper_code,
        year ? year.toString() : null,
        session,
        paper_type,
        source_type
      ].filter(Boolean);
      
      const source_path = path.relative(ROOT, file).replace(/\\/g, '/');
      const topic_id = null;

      console.log(`\n📄 处理文件 [${count + 1}/${limit}]: ${path.basename(file)}`);
      console.log(`   📋 元数据: ${subject_code} | ${year || 'N/A'} ${session || 'N/A'} | Paper ${paper_number || 'N/A'} | ${paper_type || 'N/A'}`);
      console.log(`   🏷️  类型: ${source_type}`);
      console.log(`   🆔 Paper ID: ${paper_id || 'N/A'}`);

      const pages = await extractPdfText(file);
      const chunks = pages.flatMap((pageText, idx) => {
        const sub = chunkTextByTokens(pageText, 500, 60);
        return sub.map((txt) => ({ txt, page: idx + 1 }));
      });
      
      if (chunks.length === 0) {
        console.log(`   ⚠️  警告: 无法提取文本内容，跳过`);
        skipped++;
        count++;
        continue;
      }

      console.log(`   📝 提取内容: ${pages.length} 页 -> ${chunks.length} 个文本块`);
      
      if (dryRun) { 
        console.log(`   ✅ DRY RUN: 模拟处理完成`);
        count += 1; 
        continue; 
      }

      // 创建文档记录，包含增强的元数据
      const docData = {
        subject_code,
        paper_code,
        topic_id,
        title,
        source_type,
        source_path,
        language: 'en',
        tags
      };
      
      const doc = await upsertDocument(docData);
      console.log(`   💾 文档已保存: ID=${doc.id}`);
      
      // 批量处理嵌入
      console.log(`   🔄 生成向量嵌入...`);
      const embeddings = await embedBatch(chunks.map((c) => c.txt));
      
      console.log(`   📤 上传文本块和嵌入...`);
      for (let i = 0; i < chunks.length; i++) {
        const { txt, page } = chunks[i];
        const chunkExtra = {
          kind: 'pdf',
          year,
          session,
          paper_number,
          paper_type,
          paper_id,
          original_filename
        };
        const chunk = await upsertChunk({ 
          document_id: doc.id, 
          chunk_index: i, 
          content: txt, 
          page_from: page, 
          page_to: page, 
          extra: chunkExtra 
        });
        await upsertEmbedding({ chunk_id: chunk.id, embedding: embeddings[i] });
      }
      
      processed++;
      count += 1;
      console.log(`   ✅ 处理完成: ${chunks.length} 个块已保存`);
      
    } catch (error) {
      console.error(`   ❌ 处理失败: ${error.message}`);
      if (error.stack) {
        console.error(`   📍 错误堆栈: ${error.stack.split('\n')[1]}`);
      }
      errors++;
      count++;
      
      if (!continueOnError) {
        console.error(`\n🛑 遇到错误且未启用错误继续模式，停止处理`);
        break;
      }
      
      // 继续处理下一个文件
      console.log(`   🔄 继续处理下一个文件...`);
    }
  }
  
  // 输出处理统计
  console.log(`\n📊 处理统计:`);
  console.log(`   ✅ 成功处理: ${processed} 个文件`);
  console.log(`   ⏭️  筛选跳过: ${skipped} 个文件`);
  console.log(`   🔄 已存在跳过: ${existingSkipped} 个文件`);
  console.log(`   ❌ 处理失败: ${errors} 个文件`);
  console.log(`   📈 总计扫描: ${allFiles.length} 个文件`);
  console.log(`   📊 实际处理: ${count} 个文件`);
  
  if (dryRun) {
    console.log(`\n🔍 DRY RUN 模式完成，实际未写入数据库`);
  } else {
    console.log(`\n🎉 增强PDF批量处理完成！`);
  }
  
  return {
    processed,
    skipped,
    existingSkipped,
    errors,
    total: allFiles.length
  };
}

async function main() {
  const subject = argv.subject || argv.s;
  const papers = (argv.papers || '').split(',').filter(Boolean);
  const doNotes = argv.notes || false;
  const doPdf = argv.pdf || false;
  const limit = argv.limit ? parseInt(argv.limit, 10) : undefined;
  const dry = !!argv.dry;
  const skipExisting = argv['skip-existing'] !== false; // 默认为true
  const continueOnError = argv['continue-on-error'] !== false; // 默认为true

  if (!doNotes && !doPdf) {
    console.log('Nothing to ingest. Use --notes and/or --pdf');
    console.log('\n可用选项:');
    console.log('  --subject 9702        指定科目代码');
    console.log('  --papers AS,A2        指定试卷类型');
    console.log('  --limit 50            限制处理文件数量');
    console.log('  --dry                 干运行模式（仅预览）');
    console.log('  --skip-existing       跳过已存在的文档（默认启用）');
    console.log('  --continue-on-error   遇到错误时继续处理（默认启用）');
    console.log('  --notes               处理Markdown笔记');
    console.log('  --pdf                 处理PDF文件');
    process.exit(0);
  }

  if (doNotes) {
    console.log('🔄 开始处理Markdown笔记...');
    await ingestMarkdownNotes({ subjectFilter: subject, paperFilter: papers[0], limit: limit || Infinity, dryRun: dry });
  }
  
  if (doPdf) {
    console.log('🔄 开始处理PDF文件...');
    const result = await ingestPdfsEnhanced({ 
      subjectFilter: subject, 
      paperFilter: papers[0], 
      limit: limit || 30, 
      dryRun: dry,
      skipExisting,
      continueOnError
    });
    
    console.log(`\n📈 最终统计: 成功${result.processed}, 跳过${result.skipped + result.existingSkipped}, 失败${result.errors}`);
  }

  console.log('\n🎉 数据摄取完成！');
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});


