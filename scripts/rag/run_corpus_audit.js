#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getServiceClient } from '../../api/lib/supabase/client.js';
import { auditChunkRows, renderCorpusAuditReport } from './lib/corpus-audit.js';

dotenv.config();

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_corpus_audit_summary.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_corpus_audit.md');
const PAGE_SIZE = 1000;

async function fetchAllChunks(supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const query = supabase
      .from('chunks')
      .select('id, content, syllabus_code, topic_path, node_id')
      .order('id', { ascending: true })
      .range(from, to);

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch chunks for corpus audit: ${error.message || error.code || error}`);
    }
    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  const supabase = getServiceClient();
  const rows = await fetchAllChunks(supabase);
  const summary = auditChunkRows(rows);
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, renderCorpusAuditReport(summary), 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
