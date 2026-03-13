import { TOPIC_LEAKAGE_REASON_CODES } from './constants.js';

function normalizeTopicPath(rawPath) {
  return String(rawPath || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\./, '')
    .replace(/\.$/, '');
}

function toLower(value) {
  return normalizeTopicPath(value).toLowerCase();
}

function isDescendantOrEqual(child, parent) {
  const c = toLower(child);
  const p = toLower(parent);
  if (!c || !p) return false;
  if (c === p) return true;
  return c.startsWith(`${p}.`);
}

export function normalizeTopicLeakageAllowlist(topicPaths = []) {
  const values = Array.isArray(topicPaths) ? topicPaths : [topicPaths];
  const seen = new Set();
  const normalized = [];

  for (const value of values) {
    const topicPath = normalizeTopicPath(value);
    if (!topicPath) continue;
    const key = topicPath.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(topicPath);
  }

  return normalized;
}

function isAllowedTopicPath(itemPath, allowlist = []) {
  return allowlist.some((allowedPath) => isDescendantOrEqual(itemPath, allowedPath));
}

export function evaluateTopicLeakageWithAllowlist(
  evidence = [],
  {
    currentTopicPath = null,
    allowedTopicPaths = [],
  } = {},
) {
  const normalizedAllowlist = normalizeTopicLeakageAllowlist([
    currentTopicPath,
    ...(Array.isArray(allowedTopicPaths) ? allowedTopicPaths : [allowedTopicPaths]),
  ]);

  if (!Array.isArray(evidence) || evidence.length === 0) {
    return {
      topic_leakage_flag: false,
      topic_leakage_reason: null,
      leaked_ids: [],
      allowed_topic_paths: normalizedAllowlist,
      evaluation_mode: normalizedAllowlist.length > 1 ? 'allowlist' : 'strict_current_topic',
    };
  }

  const leaked = [];
  let reason = null;
  for (const item of evidence) {
    const itemPath = item?.topic_path ? String(item.topic_path) : '';
    if (!normalizeTopicPath(itemPath)) {
      leaked.push(item?.id || null);
      reason = TOPIC_LEAKAGE_REASON_CODES.DATA_BAD_TOPIC_PATH;
      continue;
    }
    if (!isAllowedTopicPath(itemPath, normalizedAllowlist)) {
      leaked.push(item?.id || null);
      reason = TOPIC_LEAKAGE_REASON_CODES.APP_LAYER_BUG;
    }
  }

  return {
    topic_leakage_flag: leaked.length > 0,
    topic_leakage_reason: leaked.length > 0 ? (reason || TOPIC_LEAKAGE_REASON_CODES.APP_LAYER_BUG) : null,
    leaked_ids: leaked.filter(Boolean),
    allowed_topic_paths: normalizedAllowlist,
    evaluation_mode: normalizedAllowlist.length > 1 ? 'allowlist' : 'strict_current_topic',
  };
}

export function evaluateTopicLeakage(evidence = [], currentTopicPath) {
  const result = evaluateTopicLeakageWithAllowlist(evidence, {
    currentTopicPath,
    allowedTopicPaths: [currentTopicPath],
  });

  return {
    topic_leakage_flag: result.topic_leakage_flag,
    topic_leakage_reason: result.topic_leakage_reason,
    leaked_ids: result.leaked_ids,
  };
}
