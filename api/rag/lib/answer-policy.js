import { TOPIC_LEAKAGE_REASON_CODES, UNCERTAIN_REASON_CODES } from './constants.js';

function hasConflict(evidence) {
  if (!Array.isArray(evidence) || evidence.length < 2) return false;
  const snippets = evidence.map((x) => String(x.snippet || '').toLowerCase());
  const hasNegation = snippets.some((s) => /\b(no|not|never|cannot|isn't|doesn't)\b/.test(s));
  const hasAffirm = snippets.some((s) => /\b(is|are|can|will|always)\b/.test(s));
  return hasNegation && hasAffirm;
}

function defaultUncertainAnswer(reasonCode) {
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

export function decideAnswerPolicy({
  query,
  evidence = [],
  topicLeakage = { topic_leakage_flag: false, topic_leakage_reason: null },
  llmAnswer = '',
  retrievalError = null,
}) {
  if (topicLeakage?.topic_leakage_flag) {
    return {
      answer: defaultUncertainAnswer(UNCERTAIN_REASON_CODES.TOPIC_LEAKAGE_BLOCKED),
      uncertain: true,
      uncertain_reason_code: UNCERTAIN_REASON_CODES.TOPIC_LEAKAGE_BLOCKED,
      topic_leakage_flag: true,
      topic_leakage_reason: topicLeakage.topic_leakage_reason || TOPIC_LEAKAGE_REASON_CODES.APP_LAYER_BUG,
    };
  }

  if (retrievalError) {
    return {
      answer: defaultUncertainAnswer(UNCERTAIN_REASON_CODES.RETRIEVER_ERROR),
      uncertain: true,
      uncertain_reason_code: UNCERTAIN_REASON_CODES.RETRIEVER_ERROR,
      topic_leakage_flag: false,
      topic_leakage_reason: null,
    };
  }

  if (!Array.isArray(evidence) || evidence.length === 0) {
    return {
      answer: defaultUncertainAnswer(UNCERTAIN_REASON_CODES.INSUFFICIENT_EVIDENCE),
      uncertain: true,
      uncertain_reason_code: UNCERTAIN_REASON_CODES.INSUFFICIENT_EVIDENCE,
      topic_leakage_flag: false,
      topic_leakage_reason: null,
    };
  }

  if (hasConflict(evidence)) {
    return {
      answer: defaultUncertainAnswer(UNCERTAIN_REASON_CODES.CONFLICTING_EVIDENCE),
      uncertain: true,
      uncertain_reason_code: UNCERTAIN_REASON_CODES.CONFLICTING_EVIDENCE,
      topic_leakage_flag: false,
      topic_leakage_reason: null,
    };
  }

  if (!llmAnswer || !String(llmAnswer).trim()) {
    return {
      answer: defaultUncertainAnswer(UNCERTAIN_REASON_CODES.INSUFFICIENT_EVIDENCE),
      uncertain: true,
      uncertain_reason_code: UNCERTAIN_REASON_CODES.INSUFFICIENT_EVIDENCE,
      topic_leakage_flag: false,
      topic_leakage_reason: null,
    };
  }

  return {
    answer: String(llmAnswer).trim(),
    uncertain: false,
    uncertain_reason_code: null,
    topic_leakage_flag: false,
    topic_leakage_reason: null,
  };
}

