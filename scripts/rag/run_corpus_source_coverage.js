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

function parseCliArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];
    if (!current.startsWith('--')) continue;
    const eq = current.indexOf('=');
    if (eq !== -1) {
      out[current.slice(2, eq)] = current.slice(eq + 1);
      continue;
    }
    const key = current.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function getDefaultOutputNames(policyMode) {
  if (policyMode === 'production') {
    return {
      json: 'rag_corpus_source_coverage_production_summary.json',
      md: 'rag_corpus_source_coverage_production.md',
    };
  }
  if (policyMode === 'restricted_official') {
    return {
      json: 'rag_corpus_source_coverage_restricted_official_summary.json',
      md: 'rag_corpus_source_coverage_restricted_official.md',
    };
  }
  return {
    json: 'rag_corpus_source_coverage_summary.json',
    md: 'rag_corpus_source_coverage.md',
  };
}

const ROOT = process.cwd();
const PAGE_SIZE = 1000;
const RETRY_DELAYS_MS = [300, 800, 1500, 3000];
const argv = parseCliArgs(process.argv.slice(2));
const policyMode = String(argv.policy || process.env.RAG_SOURCE_POLICY_MODE || 'research').trim().toLowerCase();
const defaultNames = getDefaultOutputNames(policyMode);
const OUT_JSON = path.join(ROOT, argv['out-json'] || path.join('runs', 'backend', defaultNames.json));
const OUT_MD = path.join(ROOT, argv['out-md'] || path.join('docs', 'reports', defaultNames.md));

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
  const summary = summarizeCorpusSourceCoverage(rows, { policyMode });
  summary.inputs = {
    page_size: PAGE_SIZE,
    policy_mode: policyMode,
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
