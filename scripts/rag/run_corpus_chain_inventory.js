#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getServiceClient } from '../../api/lib/supabase/client.js';
import { renderCorpusChainInventoryReport, summarizeCorpusChainInventory } from './lib/corpus-unification.js';

dotenv.config();

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_corpus_chain_inventory.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_corpus_chain_inventory.md');
const PAGE_SIZE = 1000;

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

async function main() {
  const supabase = getServiceClient();
  const chunks = await fetchTableRows(supabase, 'chunks', 'id, syllabus_code, topic_path, node_id');
  const ragDocuments = await fetchTableRows(supabase, 'rag_documents', 'id, subject_code, source_type, paper_code');
  const ragChunks = await fetchTableRows(supabase, 'rag_chunks', 'id, document_id');
  const ragEmbeddings = await fetchTableRows(supabase, 'rag_embeddings', 'id, chunk_id');

  const summary = summarizeCorpusChainInventory({
    chunksRows: chunks.rows,
    ragDocumentsRows: ragDocuments.rows,
    ragChunksRows: ragChunks.rows,
    ragEmbeddingsRows: ragEmbeddings.rows,
    tableStates: {
      chunks: { exists: chunks.exists, error: chunks.error },
      rag_documents: { exists: ragDocuments.exists, error: ragDocuments.error },
      rag_chunks: { exists: ragChunks.exists, error: ragChunks.error },
      rag_embeddings: { exists: ragEmbeddings.exists, error: ragEmbeddings.error },
    },
  });

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, renderCorpusChainInventoryReport(summary), 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
