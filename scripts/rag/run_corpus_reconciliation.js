#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getServiceClient } from '../../api/lib/supabase/client.js';
import { renderCorpusReconciliationReport, summarizeCorpusReconciliation } from './lib/corpus-reconciliation.js';

dotenv.config();

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_corpus_reconciliation_summary.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_corpus_reconciliation.md');
const PAGE_SIZE = 1000;
const CANONICAL_BASELINE_COLUMNS = ['id', 'syllabus_code'];
const CANONICAL_OPTIONAL_COLUMNS = ['source_type', 'source_ref', 'corpus_version', 'content_hash'];

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

async function probeColumn(supabase, column) {
  try {
    const { error } = await supabase.from('chunks').select(column).limit(1);
    if (error) {
      if ((error.message || '').includes(`column chunks.${column} does not exist`)) {
        return { exists: false, error: error.message };
      }
      return { exists: false, error: error.message || error.code || String(error) };
    }
    return { exists: true, error: null };
  } catch (error) {
    return { exists: false, error: error.message || String(error) };
  }
}

async function fetchCanonicalRows(supabase) {
  const baseline = await fetchTableRows(supabase, 'chunks', CANONICAL_BASELINE_COLUMNS.join(', '));
  if (!baseline.exists) {
    return {
      exists: false,
      error: baseline.error,
      rows: [],
      canonicalContractState: 'unavailable',
    };
  }

  const columnState = {};
  for (const column of CANONICAL_OPTIONAL_COLUMNS) {
    const result = await probeColumn(supabase, column);
    columnState[column] = result;
  }

  const availableColumns = [
    ...CANONICAL_BASELINE_COLUMNS,
    ...CANONICAL_OPTIONAL_COLUMNS.filter((column) => columnState[column]?.exists === true),
  ];
  const withOptional = await fetchTableRows(supabase, 'chunks', availableColumns.join(', '));
  const rows = (withOptional.rows || []).map((row) => ({
    ...row,
    source_type: row.source_type || null,
    source_ref: row.source_ref || null,
    corpus_version: row.corpus_version || null,
    content_hash: row.content_hash || null,
  }));

  return {
    exists: true,
    error: null,
    rows,
    canonicalContractState: CANONICAL_OPTIONAL_COLUMNS.every((column) => columnState[column]?.exists === true)
      ? 'ready'
      : 'missing_contract_columns',
  };
}

async function main() {
  const supabase = getServiceClient();
  const canonical = await fetchCanonicalRows(supabase);
  const ragDocuments = await fetchTableRows(supabase, 'rag_documents', 'id, subject_code, source_type, source_path');
  const ragChunks = await fetchTableRows(supabase, 'rag_chunks', 'id, document_id, chunk_index, page_from');
  const ragEmbeddings = await fetchTableRows(supabase, 'rag_embeddings', 'id, chunk_id');

  const summary = summarizeCorpusReconciliation({
    tableStates: {
      chunks: { exists: canonical.exists, error: canonical.error },
      rag_documents: { exists: ragDocuments.exists, error: ragDocuments.error },
      rag_chunks: { exists: ragChunks.exists, error: ragChunks.error },
      rag_embeddings: { exists: ragEmbeddings.exists, error: ragEmbeddings.error },
    },
    canonicalRows: canonical.rows,
    legacyDocuments: ragDocuments.rows,
    legacyChunks: ragChunks.rows,
    legacyEmbeddings: ragEmbeddings.rows,
    legacyRouteState: 'unverified_legacy_dependency',
    canonicalContractState: canonical.canonicalContractState,
  });

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, renderCorpusReconciliationReport(summary), 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
