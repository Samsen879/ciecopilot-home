import { TOPIC_LEAKAGE_REASON_CODES, UNCERTAIN_REASON_CODES } from './constants.js';

const NEGATIVE_CONFLICT_PATTERNS = Object.freeze([
  /\bdo\s+not\s+accept\b/i,
  /\bshould\s+not\b/i,
  /\bmust\s+not\b/i,
  /\bnot\s+valid\b/i,
  /\bincorrect\b/i,
  /\binvalid\b/i,
  /\bno\s+credit\b/i,
  /\breject\b/i,
]);

const POSITIVE_CONFLICT_PATTERNS = Object.freeze([
  /\baccept\b/i,
  /\ballow\b/i,
  /\bcorrect\b/i,
  /\bvalid\b/i,
  /\bequivalent\b/i,
  /\bfull\s+marks?\b/i,
]);

const CONFLICT_TOKEN_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'then', 'than', 'when', 'where',
  'what', 'which', 'while', 'your', 'their', 'there', 'about', 'inside', 'across', 'before',
  'after', 'have', 'has', 'had', 'been', 'being', 'were', 'was', 'will', 'would', 'shall',
  'should', 'must', 'could', 'into', 'onto', 'over', 'under', 'within', 'only', 'also', 'more',
  'less', 'most', 'very', 'much', 'many', 'each', 'such', 'just', 'than', 'them', 'they', 'these',
  'those', 'does', 'is', 'are', 'can', 'not', 'mark', 'marks', 'scheme', 'paper', 'question',
  'answer', 'answers', 'cambridge', 'international', 'level', 'mathematics', 'published', 'page',
  'pages', 'ucles', 'requirements', 'defined', 'solely', 'grade', 'thresholds', 'descriptors',
  'awarded', 'award', 'candidate', 'candidates', 'credit', 'credits', 'turn', 'over', 'document',
  'consists', 'printed', 'october', 'november', 'june', 'series', 'marks', 'based', 'mind',
]);

const MIN_SHARED_CONFLICT_TOKENS = 2;

function normalizeSnippet(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function extractConflictTokens(snippet) {
  const normalized = normalizeSnippet(snippet);
  const matches = normalized.match(/[a-z0-9]+/g) || [];
  const unique = [];
  const seen = new Set();

  for (const token of matches) {
    if (token.length < 3) continue;
    if (CONFLICT_TOKEN_STOPWORDS.has(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    unique.push(token);
  }

  return unique;
}

function analyzeConflictSignals(item) {
  const normalized = normalizeSnippet(item?.snippet);
  return {
    id: item?.id || null,
    normalized,
    hasNegative: NEGATIVE_CONFLICT_PATTERNS.some((pattern) => pattern.test(normalized)),
    hasPositive: POSITIVE_CONFLICT_PATTERNS.some((pattern) => pattern.test(normalized)),
    tokens: extractConflictTokens(normalized),
  };
}

function sharedTokenCount(leftTokens, rightTokens) {
  if (!Array.isArray(leftTokens) || !Array.isArray(rightTokens)) return 0;
  const left = new Set(leftTokens);
  let count = 0;
  for (const token of rightTokens) {
    if (left.has(token)) count += 1;
  }
  return count;
}

function hasConflict(evidence) {
  if (!Array.isArray(evidence) || evidence.length < 2) return false;

  const signals = evidence
    .map((item) => analyzeConflictSignals(item))
    .filter((item) => item.hasNegative || item.hasPositive);

  if (signals.length < 2) return false;

  for (let index = 0; index < signals.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < signals.length; otherIndex += 1) {
      const left = signals[index];
      const right = signals[otherIndex];
      const hasOppositePolarity =
        (left.hasNegative && right.hasPositive) ||
        (left.hasPositive && right.hasNegative);

      if (!hasOppositePolarity) continue;
      if (sharedTokenCount(left.tokens, right.tokens) < MIN_SHARED_CONFLICT_TOKENS) continue;
      return true;
    }
  }

  return false;
}

export function defaultUncertainAnswer(reasonCode) {
  if (reasonCode === UNCERTAIN_REASON_CODES.TOPIC_LEAKAGE_BLOCKED) {
    return 'I cannot answer confidently because retrieved evidence may be outside the current syllabus boundary.';
  }
  if (reasonCode === UNCERTAIN_REASON_CODES.CONFLICTING_EVIDENCE) {
    return 'I found conflicting evidence, so I cannot provide a high-confidence final answer.';
  }
  if (reasonCode === UNCERTAIN_REASON_CODES.QUERY_OUT_OF_SCOPE) {
    return 'This question appears outside the current syllabus node scope. Please refine the topic and try again.';
  }
  if (reasonCode === UNCERTAIN_REASON_CODES.RETRIEVER_ERROR) {
    return 'I cannot answer right now because the retrieval step failed.';
  }
  return 'I do not have sufficient grounded evidence to provide a high-confidence answer.';
}

export function buildForcedUncertainPolicy(reasonCode, { topic_leakage_reason = null } = {}) {
  return {
    answer: defaultUncertainAnswer(reasonCode),
    uncertain: true,
    uncertain_reason_code: reasonCode,
    topic_leakage_flag: reasonCode === UNCERTAIN_REASON_CODES.TOPIC_LEAKAGE_BLOCKED,
    topic_leakage_reason:
      reasonCode === UNCERTAIN_REASON_CODES.TOPIC_LEAKAGE_BLOCKED
        ? topic_leakage_reason || TOPIC_LEAKAGE_REASON_CODES.APP_LAYER_BUG
        : null,
  };
}

export function decideAnswerPolicy({
  query,
  evidence = [],
  topicLeakage = { topic_leakage_flag: false, topic_leakage_reason: null },
  llmAnswer = '',
  retrievalError = null,
}) {
  if (topicLeakage?.topic_leakage_flag) {
    return buildForcedUncertainPolicy(UNCERTAIN_REASON_CODES.TOPIC_LEAKAGE_BLOCKED, {
      topic_leakage_reason: topicLeakage.topic_leakage_reason,
    });
  }

  if (retrievalError) {
    return buildForcedUncertainPolicy(UNCERTAIN_REASON_CODES.RETRIEVER_ERROR);
  }

  if (!Array.isArray(evidence) || evidence.length === 0) {
    return buildForcedUncertainPolicy(UNCERTAIN_REASON_CODES.INSUFFICIENT_EVIDENCE);
  }

  if (hasConflict(evidence)) {
    return buildForcedUncertainPolicy(UNCERTAIN_REASON_CODES.CONFLICTING_EVIDENCE);
  }

  if (!llmAnswer || !String(llmAnswer).trim()) {
    return buildForcedUncertainPolicy(UNCERTAIN_REASON_CODES.INSUFFICIENT_EVIDENCE);
  }

  return {
    answer: String(llmAnswer).trim(),
    uncertain: false,
    uncertain_reason_code: null,
    topic_leakage_flag: false,
    topic_leakage_reason: null,
  };
}
