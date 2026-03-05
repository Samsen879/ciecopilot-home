#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getServiceClient } from '../../api/lib/supabase/client.js';
import {
  renderCorpusSourceCoverageReport,
  summarizeCorpusSourceCoverage,
} from './lib/corpus-source-coverage.js';

dotenv.config();

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_corpus_source_coverage_summary.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_corpus_source_coverage.md');
const PAGE_SIZE = 1000;
const RETRY_DELAYS_MS = [300, 800, 1500, 3000];

async function fetchChunks(supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    let data = null;
    let error = null;
    let lastThrown = null;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const result = await supabase
          .from('chunks')
          .select('id, syllabus_code, topic_path, source_type, source_ref, corpus_version, node_id')
          .order('id', { ascending: true })
          .range(from, to);
        data = result?.data ?? null;
        error = result?.error ?? null;
        lastThrown = null;
        if (!error) break;
      } catch (caught) {
        lastThrown = caught;
      }

      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      }
    }

    if (lastThrown) {
      throw new Error(`Failed to fetch chunks: ${lastThrown.message || String(lastThrown)}`);
    }
    if (error) {
      throw new Error(`Failed to fetch chunks: ${error.message || error.code || error}`);
    }

    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  const supabase = getServiceClient();
  const rows = await fetchChunks(supabase);
  const summary = summarizeCorpusSourceCoverage(rows);
  summary.inputs = {
    page_size: PAGE_SIZE,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, renderCorpusSourceCoverageReport(summary), 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
