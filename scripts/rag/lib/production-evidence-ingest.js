import { getServiceClient } from '../../../api/lib/supabase/client.js';
import {
  buildCanonicalChunkRow,
  buildSourceRef,
  computeContentHash,
  upsertCanonicalChunk,
} from './canonical-chunks.js';
import { buildProductionEvidenceGovernancePreflight } from './production-evidence-governance-preflight.js';

function isTruthyFlag(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveEmbeddingConfig(env = process.env) {
  const allowOpenAiFallback = isTruthyFlag(env.RAG_ALLOW_OPENAI_FALLBACK);
  const baseUrl =
    env.VECTOR_EMBEDDING_BASE_URL
    || env.EMBEDDING_BASE_URL
    || env.DASHSCOPE_BASE_URL
    || (allowOpenAiFallback ? env.OPENAI_BASE_URL || 'https://api.openai.com/v1' : null);
  const apiKey =
    env.VECTOR_EMBEDDING_API_KEY
    || env.EMBEDDING_API_KEY
    || env.DASHSCOPE_API_KEY
    || (allowOpenAiFallback ? env.OPENAI_API_KEY || env.OPENAI_API_TOKEN || env.OPENAI_KEY : null);
  const model =
    env.VECTOR_EMBEDDING_MODEL
    || env.EMBEDDING_MODEL
    || 'text-embedding-3-small';
  const dimensionsRaw = env.VECTOR_EMBEDDING_DIMENSIONS || env.EMBEDDING_DIMENSIONS;
  const dimensions = dimensionsRaw ? Number(dimensionsRaw) : undefined;

  if (!baseUrl) {
    throw new Error('Missing embedding base URL. Provide VECTOR_EMBEDDING_BASE_URL (or EMBEDDING_BASE_URL / DASHSCOPE_BASE_URL).');
  }
  if (!apiKey) {
    throw new Error('Missing embedding API key. Provide VECTOR_EMBEDDING_API_KEY (or EMBEDDING_API_KEY / DASHSCOPE_API_KEY).');
  }

  return {
    baseUrl,
    apiKey,
    model,
    dimensions: Number.isFinite(dimensions) && dimensions > 0 ? dimensions : undefined,
  };
}

async function defaultEmbedText(text, embedding, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch implementation is required for live production evidence ingest');
  }
  const response = await fetchImpl(`${embedding.baseUrl.replace(/\/$/, '')}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${embedding.apiKey}`,
    },
    body: JSON.stringify({
      model: embedding.model,
      input: text,
      ...(embedding.dimensions ? { dimensions: embedding.dimensions } : {}),
    }),
  });
  if (!response.ok) {
    const body = typeof response.text === 'function' ? await response.text() : '';
    throw new Error(`Embedding request failed: ${response.status} ${body}`.trim());
  }
  const payload = await response.json();
  const vector = payload?.data?.[0]?.embedding;
  if (!Array.isArray(vector)) {
    throw new Error('Embedding response missing data[0].embedding');
  }
  return vector;
}

export function createProductionEvidenceLiveContext({
  env = process.env,
  getServiceClientFn = getServiceClient,
  fetchImpl = globalThis.fetch,
} = {}) {
  const supabase = getServiceClientFn();
  const embedding = resolveEmbeddingConfig(env);
  return {
    supabase,
    embedding,
    async embedText(text) {
      return defaultEmbedText(text, embedding, fetchImpl);
    },
  };
}

export function buildProductionEvidenceCanonicalRows({
  manifest = null,
  items = [],
  corpusVersion,
  manifestPath = null,
} = {}) {
  const manifestObject = manifest && typeof manifest === 'object' ? manifest : {};
  const bundleItems = Array.isArray(items) ? items : [];
  const rows = [];

  for (const item of bundleItems) {
    const topicPaths = Array.isArray(item?.topic_paths) ? item.topic_paths : [];
    const upstreamRefs = Array.isArray(item?.provenance?.upstream_refs) ? item.provenance.upstream_refs : [];
    const upstreamRefIds = upstreamRefs
      .map((ref) => normalizeString(ref?.ref_id))
      .filter(Boolean)
      .sort();

    for (const topicPath of topicPaths) {
      const cleanTopicPath = normalizeString(topicPath);
      const sourceRef = buildSourceRef({
        assetId: `${normalizeString(manifestPath) || normalizeString(manifestObject.bundle_id) || 'production_evidence'}#${normalizeString(item?.evidence_id)}`,
        sourcePath: normalizeString(manifestPath) || null,
        extra: {
          bundle_id: normalizeString(manifestObject.bundle_id) || null,
          evidence_id: normalizeString(item?.evidence_id) || null,
          subject_code: normalizeString(item?.subject_code) || null,
          topic_path: cleanTopicPath,
          review_status: normalizeString(item?.review?.status) || null,
          provenance_method: normalizeString(item?.provenance?.method) || null,
          upstream_ref_ids: upstreamRefIds,
        },
      });

      rows.push(buildCanonicalChunkRow({
        content: normalizeString(item?.statement),
        syllabusCode: normalizeString(item?.subject_code) || null,
        topicPath: cleanTopicPath || 'unmapped',
        sourceType: normalizeString(item?.source_type),
        sourceRef,
        corpusVersion,
        contentHash: computeContentHash(
          JSON.stringify({
            bundle_id: normalizeString(manifestObject.bundle_id),
            evidence_id: normalizeString(item?.evidence_id),
            topic_path: cleanTopicPath,
            statement: normalizeString(item?.statement),
          }),
        ),
      }));
    }
  }

  return rows;
}

export async function executeProductionEvidenceIngest({
  rootDir = process.cwd(),
  manifest = null,
  items = [],
  manifestPath = '',
  whitelist = null,
  corpusVersion,
  dryRun = false,
  liveContext = null,
  writeCanonicalRow = null,
} = {}) {
  const preflight = buildProductionEvidenceGovernancePreflight({
    rootDir,
    manifest,
    items,
    manifestPath,
    whitelist,
  });

  if (
    preflight.status !== 'pass'
    || preflight.summary?.governance_valid !== true
    || preflight.summary?.release_ready !== true
    || preflight.summary?.ingest_permitted !== true
  ) {
    return {
      generated_at: new Date().toISOString(),
      stage: 'rag_phase_b_production_evidence_ingest',
      status: 'blocked',
      mode: dryRun ? 'dry_run' : 'live',
      blocked_reasons: preflight.blocked_reasons || [],
      preflight,
      summary: {
        bundle_id: preflight.summary?.bundle_id || null,
        governance_valid: preflight.summary?.governance_valid === true,
        release_ready: preflight.summary?.release_ready === true,
        ingest_permitted: preflight.summary?.ingest_permitted === true,
        manifest_path: manifestPath || null,
      },
      row_counts: {
        attempted: 0,
        inserted: 0,
        updated: 0,
        skipped_existing: 0,
        failed: 0,
      },
      rows: [],
      writes: [],
    };
  }

  const rows = buildProductionEvidenceCanonicalRows({
    manifest,
    items,
    manifestPath,
    corpusVersion,
  });

  if (dryRun) {
    return {
      generated_at: new Date().toISOString(),
      stage: 'rag_phase_b_production_evidence_ingest',
      status: 'pass',
      mode: 'dry_run',
      blocked_reasons: [],
      preflight,
      summary: {
        bundle_id: preflight.summary?.bundle_id || null,
        governance_valid: true,
        release_ready: true,
        ingest_permitted: true,
        manifest_path: manifestPath || null,
        corpus_version: corpusVersion,
      },
      row_counts: {
        attempted: rows.length,
        inserted: 0,
        updated: 0,
        skipped_existing: 0,
        failed: 0,
      },
      rows,
      writes: [],
    };
  }

  const context = liveContext || createProductionEvidenceLiveContext();
  const writer = writeCanonicalRow || (async ({ row }) => (
    upsertCanonicalChunk({
      supabase: context.supabase,
      row,
      allowUpdate: true,
    })
  ));

  const writes = [];
  const rowCounts = {
    attempted: rows.length,
    inserted: 0,
    updated: 0,
    skipped_existing: 0,
    failed: 0,
  };

  for (const row of rows) {
    const embedding = await context.embedText(row.content);
    const writeResult = await writer({
      row: {
        ...row,
        embedding,
      },
    });
    writes.push({
      operation: writeResult?.operation || 'unknown',
      row: writeResult?.row || null,
      source_ref: row.source_ref,
      topic_path: row.topic_path,
      source_type: row.source_type,
      corpus_version: row.corpus_version,
    });
    if (writeResult?.operation === 'insert') rowCounts.inserted += 1;
    else if (writeResult?.operation === 'update') rowCounts.updated += 1;
    else if (writeResult?.operation === 'skip_existing') rowCounts.skipped_existing += 1;
    else rowCounts.failed += 1;
  }

  return {
    generated_at: new Date().toISOString(),
    stage: 'rag_phase_b_production_evidence_ingest',
    status: rowCounts.failed === 0 ? 'pass' : 'fail',
    mode: 'live',
    blocked_reasons: [],
    preflight,
    summary: {
      bundle_id: preflight.summary?.bundle_id || null,
      governance_valid: true,
      release_ready: true,
      ingest_permitted: true,
      manifest_path: manifestPath || null,
      corpus_version: corpusVersion,
    },
    row_counts: rowCounts,
    rows,
    writes,
  };
}

export function renderProductionEvidenceIngestReport(result = {}) {
  const lines = [
    '# Phase B Production Evidence Ingest',
    '',
    `- status: \`${result.status || 'unknown'}\``,
    `- mode: \`${result.mode || 'unknown'}\``,
    `- bundle_id: \`${result.summary?.bundle_id || 'unknown'}\``,
    `- corpus_version: \`${result.summary?.corpus_version || 'unknown'}\``,
    `- governance_valid: \`${Boolean(result.summary?.governance_valid)}\``,
    `- release_ready: \`${Boolean(result.summary?.release_ready)}\``,
    `- ingest_permitted: \`${Boolean(result.summary?.ingest_permitted)}\``,
    `- attempted: \`${result.row_counts?.attempted || 0}\``,
    `- inserted: \`${result.row_counts?.inserted || 0}\``,
    `- updated: \`${result.row_counts?.updated || 0}\``,
    `- skipped_existing: \`${result.row_counts?.skipped_existing || 0}\``,
    `- failed: \`${result.row_counts?.failed || 0}\``,
    '',
    '## Blocked Reasons',
    '',
  ];

  if (!Array.isArray(result.blocked_reasons) || result.blocked_reasons.length === 0) {
    lines.push('- none');
  } else {
    for (const reason of result.blocked_reasons) {
      lines.push(`- ${reason}`);
    }
  }

  lines.push('', '## Writes', '');
  if (!Array.isArray(result.writes) || result.writes.length === 0) {
    lines.push('- none');
  } else {
    for (const write of result.writes) {
      lines.push(
        `- operation=\`${write.operation || 'unknown'}\` id=\`${write.row?.id ?? 'n/a'}\` source_type=\`${write.source_type || 'unknown'}\` topic_path=\`${write.topic_path || 'unknown'}\``,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}
