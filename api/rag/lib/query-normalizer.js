import { FUNCTION_WHITELIST, GREEK_WHITELIST } from './constants.js';

function uniqueTokens(tokens) {
  const seen = new Set();
  const out = [];
  for (const token of tokens) {
    const value = String(token || '').trim();
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export function normalizeQuery(query) {
  const raw = String(query || '').trim();
  const normalized = raw.replace(/\s+/g, ' ').trim();

  const tokens = [];
  const commandMatches = [...normalized.matchAll(/\\([a-zA-Z]+)/g)].map((m) => m[1].toLowerCase());
  for (const cmd of commandMatches) {
    if (FUNCTION_WHITELIST.includes(cmd) || GREEK_WHITELIST.includes(cmd)) {
      tokens.push(cmd);
    }
  }

  const subSupMatches = [...normalized.matchAll(/([a-zA-Z])\s*[\^_]\s*([0-9a-zA-Z]+)/g)];
  for (const m of subSupMatches) {
    tokens.push(m[1].toLowerCase());
    tokens.push(String(m[2]).toLowerCase());
  }

  const deNoised = normalized
    .replace(/[{}]/g, ' ')
    .replace(/\\+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const baseMatches = deNoised.match(/[A-Za-z]+|[0-9]+|[+\-*/^=()]/g) || [];
  for (const token of baseMatches) {
    const lower = token.toLowerCase();
    if (/[a-z]/i.test(token)) {
      tokens.push(lower);
    } else {
      tokens.push(token);
    }
  }

  const keyword_tokens = uniqueTokens(tokens).slice(0, 64);
  const keyword_query = keyword_tokens.join(' ');
  const is_formula_sensitive = /[\^_=]|\\[a-zA-Z]+/.test(normalized);

  return {
    raw_query: raw,
    normalized_query: normalized,
    keyword_tokens,
    keyword_query,
    is_formula_sensitive,
  };
}

