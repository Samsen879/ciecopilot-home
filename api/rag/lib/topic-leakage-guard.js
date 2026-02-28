import { TOPIC_LEAKAGE_REASON_CODES } from './constants.js';

function toLower(v) {
  return String(v || '').trim().toLowerCase();
}

function isDescendantOrEqual(child, parent) {
  const c = toLower(child);
  const p = toLower(parent);
  if (!c || !p) return false;
  if (c === p) return true;
  return c.startsWith(`${p}.`);
}

export function evaluateTopicLeakage(evidence = [], currentTopicPath) {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return {
      topic_leakage_flag: false,
      topic_leakage_reason: null,
      leaked_ids: [],
    };
  }

  const leaked = [];
  let reason = null;
  for (const item of evidence) {
    const itemPath = item?.topic_path ? String(item.topic_path) : '';
    if (!itemPath) {
      leaked.push(item?.id || null);
      reason = TOPIC_LEAKAGE_REASON_CODES.DATA_BAD_TOPIC_PATH;
      continue;
    }
    if (!isDescendantOrEqual(itemPath, currentTopicPath)) {
      leaked.push(item?.id || null);
      reason = TOPIC_LEAKAGE_REASON_CODES.APP_LAYER_BUG;
    }
  }

  return {
    topic_leakage_flag: leaked.length > 0,
    topic_leakage_reason: leaked.length > 0 ? (reason || TOPIC_LEAKAGE_REASON_CODES.APP_LAYER_BUG) : null,
    leaked_ids: leaked.filter(Boolean),
  };
}

