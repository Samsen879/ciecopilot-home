#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getServiceClient } from '../../api/lib/supabase/client.js';
import { buildCanonicalChunkRow, buildSourceRef, upsertCanonicalChunk } from './lib/canonical-chunks.js';
import { summarizeLegacyBackfill } from './lib/corpus-reconciliation.js';

dotenv.config();

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_legacy_backfill_summary.json');
const PAGE_SIZE = 1000;
const DRY_RUN = process.argv.includes('--dry');
const CORPUS_VERSION = process.env.RAG_CORPUS_VERSION || 'rag_corpus_unification_backfill_v1';

async function fetchTableRows(supabase, table, columns) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase.from(table).select(columns).range(from, to);
    if (error) {
      return {
        exists: false,
        error: error.message || error.code || String(error),
        rows: [],
      };
    }
    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return {
    exists: true,
    error: null,
    rows,
  };
}

function buildBackfillCanonicalRow({ doc, chunk, embeddingRow }) {
  const extra = chunk.extra && typeof chunk.extra === 'object' ? chunk.extra : {};
  const sourceRef = buildSourceRef({
    assetId: doc.source_path || `legacy-document:${doc.id}`,
    pageNo: Number.isInteger(chunk.page_from) ? chunk.page_from : undefined,
    questionId: typeof extra.question_id === 'string' ? extra.question_id : undefined,
    sectionId: typeof doc.topic_id === 'string' && doc.topic_id.trim() ? doc.topic_id : undefined,
    chunkIndex: Number.isInteger(chunk.chunk_index) ? chunk.chunk_index : 0,
    paperId: typeof extra.paper_id === 'string' ? extra.paper_id : undefined,
    sourcePath: doc.source_path || undefined,
  });

  return buildCanonicalChunkRow({
    content: chunk.content,
    embedding: embeddingRow?.embedding || null,
    syllabusCode: doc.subject_code,
    topicPath: 'unmapped',
    nodeId: null,
    sourceType: doc.source_type || 'legacy_chunk',
    sourceRef,
    corpusVersion: CORPUS_VERSION,
  });
}

async function main() {
  const supabase = getServiceClient();
  const ragDocuments = await fetchTableRows(supabase, 'rag_documents', 'id, subject_code, source_type, source_path, topic_id');
  const ragChunks = await fetchTableRows(supabase, 'rag_chunks', 'id, document_id, chunk_index, content, page_from, page_to, extra');
  const ragEmbeddings = await fetchTableRows(supabase, 'rag_embeddings', 'id, chunk_id, embedding');

  const tableStates = {
    rag_documents: { exists: ragDocuments.exists, error: ragDocuments.error },
    rag_chunks: { exists: ragChunks.exists, error: ragChunks.error },
    rag_embeddings: { exists: ragEmbeddings.exists, error: ragEmbeddings.error },
  };

  const docById = new Map(ragDocuments.rows.map((row) => [row.id, row]));
  const embeddingByChunkId = new Map(ragEmbeddings.rows.map((row) => [row.chunk_id, row]));
  const bridgeResults = [];

  if (ragDocuments.exists && ragChunks.exists && ragEmbeddings.exists) {
    for (const chunk of ragChunks.rows) {
      const doc = docById.get(chunk.document_id);
      if (!doc) {
        bridgeResults.push({
          chunk_id: chunk.id,
          status: 'failed',
          reason: 'missing_document',
        });
        continue;
      }

      try {
        const row = buildBackfillCanonicalRow({
          doc,
          chunk,
          embeddingRow: embeddingByChunkId.get(chunk.id),
        });

        if (DRY_RUN) {
          bridgeResults.push({
            chunk_id: chunk.id,
            status: 'inserted',
            dry_run: true,
          });
          continue;
        }

        const result = await upsertCanonicalChunk({ supabase, row });
        bridgeResults.push({
          chunk_id: chunk.id,
          status: result.operation === 'update' ? 'updated' : 'inserted',
        });
      } catch (error) {
        bridgeResults.push({
          chunk_id: chunk.id,
          status: 'failed',
          reason: error.message || String(error),
        });
      }
    }
  }

  const summary = summarizeLegacyBackfill({
    tableStates,
    legacyDocuments: ragDocuments.rows,
    legacyChunks: ragChunks.rows,
    legacyEmbeddings: ragEmbeddings.rows,
    bridgeResults,
  });

  summary.dry_run = DRY_RUN;
  summary.corpus_version = CORPUS_VERSION;

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_JSON}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
