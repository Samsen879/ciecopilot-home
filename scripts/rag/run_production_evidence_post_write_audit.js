#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getServiceClient } from '../../api/lib/supabase/client.js';
import {
  buildProductionEvidencePostWriteAudit,
  renderProductionEvidencePostWriteAuditReport,
} from './lib/production-evidence-post-write-audit.js';

const ROOT = process.cwd();
const __filename = fileURLToPath(import.meta.url);
const DEFAULT_OUT_JSON = 'runs/backend/rag_phase_b_production_evidence_ready_pilot_post_write_audit.json';
const DEFAULT_OUT_MD = 'docs/reports/rag_phase_b_production_evidence_ready_pilot_post_write_audit.md';

dotenv.config();
dotenv.config({ path: path.resolve(ROOT, '.env.local'), override: false });

function parseCliArgs(args) {
  const out = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('-')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      out[token.slice(token.startsWith('--') ? 2 : 1, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(token.startsWith('--') ? 2 : 1);
    const next = args[index + 1];
    if (next && !next.startsWith('-')) {
      out[key] = next;
      index += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function readbackChunkRows(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('chunks')
    .select('id, source_type, source_ref, topic_path, corpus_version, content_hash')
    .in('id', ids);
  if (error) {
    throw error;
  }
  return Array.isArray(data) ? data : [];
}

export async function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  if (!cli['ingest-json']) {
    throw new Error('ingest-json is required');
  }

  const ingestJsonPath = path.join(ROOT, cli['ingest-json']);
  const ingestPayload = readJson(ingestJsonPath);
  const rowIds = (ingestPayload.writes || [])
    .map((write) => write?.row?.id)
    .filter((id) => Number.isInteger(id) || (typeof id === 'string' && id.trim()));
  const readbackRows = await readbackChunkRows(rowIds);
  const payload = buildProductionEvidencePostWriteAudit({
    ingestPayload,
    readbackRows,
  });

  const outJson = path.join(ROOT, cli['out-json'] || DEFAULT_OUT_JSON);
  const outMd = path.join(ROOT, cli['out-md'] || DEFAULT_OUT_MD);
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.mkdirSync(path.dirname(outMd), { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderProductionEvidencePostWriteAuditReport(payload), 'utf8');

  process.stdout.write(`${toRel(outJson)}\n`);
  process.stdout.write(`${toRel(outMd)}\n`);
  if (payload.status !== 'pass') {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
