import { TOPIC_LEAKAGE_REASON_CODES, UNCERTAIN_REASON_CODES } from './constants.js';
import { RagError } from './errors.js';

const UNCERTAIN_ENUM = new Set(Object.values(UNCERTAIN_REASON_CODES));
const LEAKAGE_ENUM = new Set(Object.values(TOPIC_LEAKAGE_REASON_CODES));

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isResolvableSourceRef(sourceRef) {
  if (!isObject(sourceRef)) return false;
  if (typeof sourceRef.asset_id !== 'string' || !sourceRef.asset_id.trim()) return false;
  const hasPage = Number.isInteger(sourceRef.page_no) && sourceRef.page_no > 0;
  const hasQuestion = typeof sourceRef.question_id === 'string' && sourceRef.question_id.trim().length > 0;
  return hasPage || hasQuestion;
}

export function validateAskResponseSchema(payload) {
  const errors = [];

  if (!isObject(payload)) {
    errors.push('response must be an object');
    return { valid: false, errors };
  }
  if (typeof payload.answer !== 'string') errors.push('answer must be string');
  if (typeof payload.uncertain !== 'boolean') errors.push('uncertain must be boolean');
  if (typeof payload.topic_leakage_flag !== 'boolean') errors.push('topic_leakage_flag must be boolean');
  if (!Array.isArray(payload.evidence)) errors.push('evidence must be array');

  if (payload.uncertain === true) {
    if (!UNCERTAIN_ENUM.has(payload.uncertain_reason_code)) {
      errors.push('uncertain_reason_code must be a valid enum when uncertain=true');
    }
  }

  if (payload.topic_leakage_flag === true) {
    if (!LEAKAGE_ENUM.has(payload.topic_leakage_reason)) {
      errors.push('topic_leakage_reason must be a valid enum when topic_leakage_flag=true');
    }
  }

  if (Array.isArray(payload.evidence)) {
    for (const [index, item] of payload.evidence.entries()) {
      if (!isObject(item)) {
        errors.push(`evidence[${index}] must be object`);
        continue;
      }
      if (typeof item.id !== 'string' || !item.id.trim()) errors.push(`evidence[${index}].id invalid`);
      if (typeof item.topic_path !== 'string' || !item.topic_path.trim()) errors.push(`evidence[${index}].topic_path invalid`);
      if (typeof item.snippet !== 'string' || !item.snippet.trim()) errors.push(`evidence[${index}].snippet invalid`);
      if (typeof item.score !== 'number' || Number.isNaN(item.score)) errors.push(`evidence[${index}].score invalid`);
      if (typeof item.source_type !== 'string' || !item.source_type.trim()) errors.push(`evidence[${index}].source_type invalid`);
      if (!isResolvableSourceRef(item.source_ref)) errors.push(`evidence[${index}].source_ref invalid`);
      for (const rankField of ['rank_key', 'rank_sem', 'fused_rank']) {
        if (typeof item[rankField] !== 'undefined' && !Number.isInteger(item[rankField])) {
          errors.push(`evidence[${index}].${rankField} must be integer when provided`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertAskResponseSchema(payload) {
  const result = validateAskResponseSchema(payload);
  if (!result.valid) {
    throw new RagError({
      status: 500,
      code: 'RAG_RESPONSE_SCHEMA_INVALID',
      message: `Ask response schema validation failed: ${result.errors.join('; ')}`,
      details: { errors: result.errors },
    });
  }
}

