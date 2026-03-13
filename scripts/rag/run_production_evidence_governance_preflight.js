#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadJsonArtifact, loadProductionEvidenceBundle } from './lib/production-evidence-bundle.js';
import {
  buildProductionEvidenceGovernancePreflight,
  renderProductionEvidenceGovernancePreflightReport,
} from './lib/production-evidence-governance-preflight.js';

const ROOT = process.cwd();
const __filename = fileURLToPath(import.meta.url);
const DEFAULT_WHITELIST = 'data/evidence/production/whitelist_v1.json';
const DEFAULT_OUT_JSON = 'runs/backend/rag_phase_b_production_evidence_governance_preflight.json';
const DEFAULT_OUT_MD = 'docs/reports/rag_phase_b_production_evidence_governance_preflight.md';

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

export function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  if (!cli.manifest) {
    throw new Error('manifest path is required');
  }

  const whitelistRelPath = cli.whitelist || DEFAULT_WHITELIST;
  const outJsonRelPath = cli['out-json'] || DEFAULT_OUT_JSON;
  const outMdRelPath = cli['out-md'] || DEFAULT_OUT_MD;
  const { manifest, items, manifestPath } = loadProductionEvidenceBundle({
    root: ROOT,
    manifestPath: cli.manifest,
  });
  const { payload: whitelist } = loadJsonArtifact({ root: ROOT, filePath: whitelistRelPath });
  const payload = buildProductionEvidenceGovernancePreflight({
    rootDir: ROOT,
    manifest,
    items,
    manifestPath,
    whitelist,
  });

  const outJson = path.join(ROOT, outJsonRelPath);
  const outMd = path.join(ROOT, outMdRelPath);
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.mkdirSync(path.dirname(outMd), { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderProductionEvidenceGovernancePreflightReport(payload), 'utf8');

  process.stdout.write(`${toRel(outJson)}\n`);
  process.stdout.write(`${toRel(outMd)}\n`);
  if (payload.status !== 'pass' || payload.summary?.ingest_permitted !== true) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
