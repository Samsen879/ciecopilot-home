import crypto from 'crypto';

export const CANONICAL_WRITE_MODES = Object.freeze(['legacy', 'bridge', 'canonical']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stableSortObject(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stableSortObject(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = stableSortObject(value[key]);
      return acc;
    }, {});
}

export function stableStringify(value) {
  return JSON.stringify(stableSortObject(value));
}

export function computeContentHash(content) {
  return crypto.createHash('sha1').update(String(content || '')).digest('hex');
}

export function normalizeWriteMode(mode) {
  const normalized = String(mode || 'bridge').trim().toLowerCase();
  if (!CANONICAL_WRITE_MODES.includes(normalized)) {
    throw new Error(`Unsupported canonical write mode: ${mode}`);
  }
  return normalized;
}

export function describeWriteModeTargets(mode) {
  const normalized = normalizeWriteMode(mode);
  return {
    mode: normalized,
    writesLegacy: normalized === 'legacy' || normalized === 'bridge',
    writesCanonical: normalized === 'canonical' || normalized === 'bridge',
  };
}

export function resolveCorpusVersion({
  cliValue,
  envValue,
  runStartedAt,
} = {}) {
  const direct = String(cliValue || envValue || '').trim();
  if (direct) return direct;

  const date = runStartedAt instanceof Date ? runStartedAt : new Date();
  const isoDay = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `rag_corpus_unification_${isoDay}`;
}

export function buildSourceRef({
  assetId,
  pageNo,
  questionId,
  sectionId,
  chunkIndex,
  paperId,
  sourcePath,
} = {}) {
  if (typeof assetId !== 'string' || !assetId.trim()) {
    throw new Error('assetId is required to build canonical source_ref');
  }

  const sourceRef = {
    asset_id: assetId.trim(),
  };

  if (Number.isInteger(pageNo) && pageNo > 0) {
    sourceRef.page_no = pageNo;
  }
  if (typeof questionId === 'string' && questionId.trim()) {
    sourceRef.question_id = questionId.trim();
  }
  if (typeof sectionId === 'string' && sectionId.trim()) {
    sourceRef.section_id = sectionId.trim();
  }
  if (Number.isInteger(chunkIndex) && chunkIndex >= 0) {
    sourceRef.chunk_index = chunkIndex;
  }
  if (typeof paperId === 'string' && paperId.trim()) {
    sourceRef.paper_id = paperId.trim();
  }
  if (typeof sourcePath === 'string' && sourcePath.trim()) {
    sourceRef.source_path = sourcePath.trim();
  }

  if (!sourceRef.page_no && !sourceRef.question_id) {
    sourceRef.question_id = `chunk:${sourceRef.chunk_index ?? 0}`;
  }

  return sourceRef;
}

export function canonicalChunkIdentity({
  sourceType,
  sourceRef,
  contentHash,
}) {
  if (typeof sourceType !== 'string' || !sourceType.trim()) {
    throw new Error('sourceType is required for canonical chunk identity');
  }
  if (!sourceRef || typeof sourceRef !== 'object') {
    throw new Error('sourceRef is required for canonical chunk identity');
  }
  if (typeof contentHash !== 'string' || !contentHash.trim()) {
    throw new Error('contentHash is required for canonical chunk identity');
  }

  return `${sourceType.trim()}::${stableStringify(sourceRef)}::${contentHash.trim()}`;
}

export function buildCanonicalChunkRow({
  content,
  embedding,
  syllabusCode,
  topicPath = 'unmapped',
  nodeId = null,
  sourceType,
  sourceRef,
  corpusVersion,
  contentHash,
} = {}) {
  const normalizedContent = String(content || '').trim();
  if (!normalizedContent) {
    throw new Error('content is required for canonical chunk row');
  }
  if (typeof sourceType !== 'string' || !sourceType.trim()) {
    throw new Error('sourceType is required for canonical chunk row');
  }
  if (!sourceRef || typeof sourceRef !== 'object') {
    throw new Error('sourceRef is required for canonical chunk row');
  }
  if (typeof corpusVersion !== 'string' || !corpusVersion.trim()) {
    throw new Error('corpusVersion is required for canonical chunk row');
  }

  const hash = String(contentHash || computeContentHash(normalizedContent)).trim();
  if (!hash) {
    throw new Error('contentHash is required for canonical chunk row');
  }

  return {
    content: normalizedContent,
    embedding: Array.isArray(embedding) ? embedding : embedding ?? null,
    syllabus_code: syllabusCode || null,
    topic_path: topicPath || 'unmapped',
    node_id: nodeId || null,
    source_type: sourceType.trim(),
    source_ref: sourceRef,
    corpus_version: corpusVersion.trim(),
    content_hash: hash,
  };
}

export function canonicalChunkMatchesIdentity(row, identity) {
  if (!row || !identity) return false;
  return canonicalChunkIdentity({
    sourceType: row.source_type,
    sourceRef: row.source_ref,
    contentHash: row.content_hash,
  }) === identity;
}

function isTransientSupabaseError(error) {
  if (!error) return false;
  const text = [
    error.message,
    error.details,
    error.hint,
    error.code,
    error.name,
    typeof error === 'string' ? error : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    text.includes('fetch failed') ||
    text.includes('network') ||
    text.includes('econnreset') ||
    text.includes('etimedout') ||
    text.includes('unexpected eof')
  );
}

async function withTransientRetry(fn, { maxAttempts = 3, baseDelayMs = 250 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientSupabaseError(error) || attempt >= maxAttempts) {
        throw error;
      }
      const delayMs = baseDelayMs * attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

export async function upsertCanonicalChunk({
  supabase,
  row,
  allowUpdate = false,
} = {}) {
  if (!supabase) {
    throw new Error('supabase client is required');
  }
  if (!row || typeof row !== 'object') {
    throw new Error('canonical row is required');
  }

  const identity = canonicalChunkIdentity({
    sourceType: row.source_type,
    sourceRef: row.source_ref,
    contentHash: row.content_hash,
  });

  const { data: existingRows, error: selectError } = await withTransientRetry(async () => (
    await supabase
      .from('chunks')
      .select('id, source_type, source_ref, content_hash')
      .eq('content_hash', row.content_hash)
      .eq('source_type', row.source_type)
      .limit(20)
  ));

  if (selectError) throw selectError;

  const existing = (existingRows || []).find((candidate) => canonicalChunkMatchesIdentity(candidate, identity));
  if (existing) {
    if (!allowUpdate) {
      return {
        operation: 'skip_existing',
        row: existing,
      };
    }
    const { data, error } = await withTransientRetry(async () => (
      await supabase
        .from('chunks')
        .update(row)
        .eq('id', existing.id)
        .select()
        .single()
    ));
    if (error) {
      const message = String(error.message || error);
      if (message.includes('updated_at')) {
        return {
          operation: 'skip_existing',
          row: existing,
        };
      }
      throw error;
    }
    return {
      operation: 'update',
      row: data,
    };
  }

  const { data, error } = await withTransientRetry(async () => (
    await supabase
      .from('chunks')
      .insert(row)
      .select()
      .single()
  ));
  if (error) throw error;

  return {
    operation: 'insert',
    row: data,
  };
}
