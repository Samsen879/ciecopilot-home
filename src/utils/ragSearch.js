import {
  enhanceMessageWithRAG as enhanceMessageWithRAGV2,
  formatRAGContext as formatRAGContextV2,
  ragSearch as ragSearchV2,
  shouldUseRAG as shouldUseRAGV2
} from '../api/ragApi';

let warnedLegacyImport = false;

function warnLegacyImport(apiName) {
  if (warnedLegacyImport) {
    return;
  }
  warnedLegacyImport = true;
  console.warn(
    `[ragSearch] \`${apiName}\` from src/utils/ragSearch.js is deprecated. ` +
    'Use src/api/ragApi.js exports instead.'
  );
}

export async function generateEmbedding(text) {
  if (text?.trim()) {
    console.warn('[ragSearch] generateEmbedding() is deprecated on frontend. Embeddings are generated server-side.');
  }
  return null;
}

export async function ragSearch(query, options = {}) {
  warnLegacyImport('ragSearch');
  return ragSearchV2(query, options);
}

export function shouldUseRAG(query) {
  warnLegacyImport('shouldUseRAG');
  return shouldUseRAGV2(query);
}

export function formatRAGContext(results) {
  warnLegacyImport('formatRAGContext');
  return formatRAGContextV2(results);
}

export async function enhanceMessageWithRAG(userMessage, options = {}) {
  warnLegacyImport('enhanceMessageWithRAG');
  return enhanceMessageWithRAGV2(userMessage, options);
}

export default {
  generateEmbedding,
  ragSearch,
  shouldUseRAG,
  formatRAGContext,
  enhanceMessageWithRAG
};


