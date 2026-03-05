#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { getServiceClient } from '../../api/lib/supabase/client.js';
import {
  auditCurriculumNodes,
  renderCurriculumNodesQualityReport,
} from './lib/curriculum-nodes-quality-audit.js';

dotenv.config();

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_curriculum_nodes_quality_audit.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_curriculum_nodes_quality_audit.md');
const MANUAL_SAMPLE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_curriculum_nodes_manual_samples.json');
const PAGE_SIZE = 1000;
const RETRY_DELAYS_MS = [300, 800, 1500, 3000];

function parseCliArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('-')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      out[token.slice(token.startsWith('--') ? 2 : 1, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(token.startsWith('--') ? 2 : 1);
    const next = args[i + 1];
    if (next && !next.startsWith('-')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

async function fetchCurriculumNodes(supabase) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    let data = null;
    let error = null;
    let lastThrown = null;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const result = await supabase
          .from('curriculum_nodes')
          .select('node_id, topic_path, syllabus_code, subject_code, title, description')
          .order('node_id', { ascending: true })
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
      throw new Error(`Failed to fetch curriculum_nodes: ${lastThrown.message || String(lastThrown)}`);
    }
    if (error) {
      throw new Error(`Failed to fetch curriculum_nodes: ${error.message || error.code || error}`);
    }
    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

async function main() {
  const argv = parseCliArgs(process.argv.slice(2));
  const manualSamplePath = argv['manual-sample-file']
    ? path.resolve(ROOT, String(argv['manual-sample-file']))
    : MANUAL_SAMPLE_FILE;

  const supabase = getServiceClient();
  const rows = await fetchCurriculumNodes(supabase);
  const manualSample = readJsonIfExists(manualSamplePath);

  const summary = auditCurriculumNodes(rows, manualSample);
  summary.inputs = {
    manual_sample_file: path.relative(ROOT, manualSamplePath).replace(/\\/g, '/'),
    manual_sample_exists: fs.existsSync(manualSamplePath),
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, renderCurriculumNodesQualityReport(summary), 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
