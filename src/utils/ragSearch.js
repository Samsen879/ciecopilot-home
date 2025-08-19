// RAG搜索功能集成
import { supabase } from './supabase';

// 配置环境变量
const EMBEDDING_BASE_URL = 
  import.meta.env.VITE_EMBEDDING_BASE_URL ||
  import.meta.env.VITE_OPENAI_BASE_URL ||
  'https://api.openai.com/v1';

const EMBEDDING_API_KEY =
  import.meta.env.VITE_EMBEDDING_API_KEY ||
  import.meta.env.VITE_OPENAI_API_KEY;

const EMBEDDING_MODEL =
  import.meta.env.VITE_EMBEDDING_MODEL ||
  'text-embedding-3-small';

const EMBEDDING_DIMENSIONS = (() => {
  const v = import.meta.env.VITE_EMBEDDING_DIMENSIONS;
  const n = v ? Number(v) : undefined;
  return Number.isFinite(n) && n > 0 ? n : undefined;
})();

/**
 * 生成文本的向量嵌入
 * @param {string} text - 要嵌入的文本
 * @returns {Promise<number[]|null>} 向量嵌入数组或null
 */
export async function generateEmbedding(text) {
  if (!EMBEDDING_API_KEY) {
    console.warn('No embedding API key configured, falling back to fulltext search');
    return null;
  }

  try {
    const response = await fetch(`${EMBEDDING_BASE_URL.replace(/\/$/, '')}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EMBEDDING_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        ...(EMBEDDING_DIMENSIONS ? { dimensions: EMBEDDING_DIMENSIONS } : {})
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data?.data?.[0]?.embedding || null;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

/**
 * 执行RAG搜索（混合向量+全文搜索）
 * @param {string} query - 搜索查询
 * @param {Object} options - 搜索选项
 * @returns {Promise<Array>} 搜索结果
 */
export async function ragSearch(query, options = {}) {
  const {
    subject_code = null,
    paper_code = null,
    topic_id = null,
    match_count = 8,
    weight_embedding = 0.65,
    weight_fulltext = 0.35
  } = options;

  try {
    // 尝试生成向量嵌入
    const embedding = await generateEmbedding(query);

    let data, error;

    if (embedding) {
      // 使用混合搜索（向量 + 全文）
      const response = await supabase.rpc('rag_search_hybrid', {
        query_text: query,
        query_embedding: embedding,
        in_subject_code: subject_code,
        in_paper_code: paper_code,
        in_topic_id: topic_id,
        match_count: match_count,
        weight_embedding: weight_embedding,
        weight_fulltext: weight_fulltext
      });
      data = response.data;
      error = response.error;
    } else {
      // 回退到全文搜索
      const response = await supabase.rpc('rag_search_fulltext', {
        query_text: query,
        in_subject_code: subject_code,
        in_paper_code: paper_code,
        in_topic_id: topic_id,
        match_count: match_count
      });
      data = response.data;
      error = response.error;
    }

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('RAG search error:', error);
    return [];
  }
}

/**
 * 检测查询是否需要RAG搜索支持
 * @param {string} query - 用户查询
 * @returns {boolean} 是否需要RAG搜索
 */
export function shouldUseRAG(query) {
  // 简单的启发式规则判断是否需要RAG
  const keywords = [
    // 学科相关
    'mathematics', 'physics', 'chemistry', 'biology',
    '数学', '物理', '化学', '生物',
    // 题目相关
    'question', 'problem', 'example', 'solution',
    '题目', '问题', '例题', '解答', '答案',
    // 概念相关
    'definition', 'formula', 'theorem', 'proof',
    '定义', '公式', '定理', '证明',
    // 学习相关
    'how to', 'explain', 'calculate', 'solve',
    '如何', '解释', '计算', '求解'
  ];

  const lowerQuery = query.toLowerCase();
  return keywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * 格式化RAG搜索结果为聊天上下文
 * @param {Array} results - RAG搜索结果
 * @returns {string} 格式化的上下文字符串
 */
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

/**
 * 增强聊天消息，如果需要则添加RAG上下文
 * @param {string} userMessage - 用户消息
 * @param {Object} options - 搜索选项
 * @returns {Promise<string>} 增强后的消息（包含RAG上下文）
 */
export async function enhanceMessageWithRAG(userMessage, options = {}) {
  // 检查是否需要RAG搜索
  if (!shouldUseRAG(userMessage)) {
    return userMessage;
  }

  try {
    // 执行RAG搜索
    const ragResults = await ragSearch(userMessage, options);
    
    if (ragResults.length === 0) {
      return userMessage;
    }

    // 格式化上下文
    const context = formatRAGContext(ragResults);
    
    // 将上下文添加到用户消息前
    return `${context}基于上述资料，请回答：${userMessage}`;
    
  } catch (error) {
    console.error('Error enhancing message with RAG:', error);
    return userMessage;
  }
}

export default {
  generateEmbedding,
  ragSearch,
  shouldUseRAG,
  formatRAGContext,
  enhanceMessageWithRAG
};




