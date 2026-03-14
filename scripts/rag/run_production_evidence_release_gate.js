#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadJsonArtifact, loadProductionEvidenceBundle } from './lib/production-evidence-bundle.js';
import {
  buildProductionEvidenceReleaseGate,
  renderProductionEvidenceReleaseGateReport,
} from './lib/production-evidence-release-gate.js';

const ROOT = process.cwd();
const __filename = fileURLToPath(import.meta.url);
const DEFAULT_WHITELIST = 'data/evidence/production/whitelist_v1.json';
const DEFAULT_OUT_JSON = 'runs/backend/rag_phase_b_production_evidence_release_gate.json';
const DEFAULT_OUT_MD = 'docs/reports/rag_phase_b_production_evidence_release_gate.md';

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

function renderSummaryReport(payload) {
  const lines = [
    '# Phase B Production Evidence Release Gate',
    '',
    `- status: \`${payload.status}\``,
    `- release_ready: \`${payload.release_ready}\``,
    `- bundle_count: \`${payload.bundle_results.length}\``,
    '',
  ];

  for (const bundle of payload.bundle_results || []) {
    lines.push(`## ${bundle.summary?.bundle_id || 'unknown'}`, '');
    lines.push(renderProductionEvidenceReleaseGateReport(bundle).trimEnd(), '');
  }

  return `${lines.join('\n')}\n`;
}

export function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  const whitelistRelPath = cli.whitelist || DEFAULT_WHITELIST;
  const outJsonRelPath = cli['out-json'] || DEFAULT_OUT_JSON;
  const outMdRelPath = cli['out-md'] || DEFAULT_OUT_MD;
  const { payload: whitelist } = loadJsonArtifact({ root: ROOT, filePath: whitelistRelPath });
  const selectedEntries = cli.manifest
    ? (whitelist.entries || []).filter((entry) => entry.manifest_path === cli.manifest)
    : (whitelist.entries || []);

  const bundleResults = selectedEntries.map((entry) => {
    const { manifest, items } = loadProductionEvidenceBundle({ root: ROOT, manifestPath: entry.manifest_path });
    return buildProductionEvidenceReleaseGate({
      rootDir: ROOT,
      manifest,
      items,
      manifestPath: entry.manifest_path,
      whitelist,
    });
  });

  const payload = {
    generated_at: new Date().toISOString(),
    stage: 'rag_phase_b_production_evidence_release_gate',
    whitelist: whitelistRelPath,
    bundle_results: bundleResults,
    release_ready: bundleResults.every((item) => item.release_ready === true),
    status: bundleResults.every((item) => item.status === 'pass') ? 'pass' : 'fail',
  };

  const outJson = path.join(ROOT, outJsonRelPath);
  const outMd = path.join(ROOT, outMdRelPath);
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.mkdirSync(path.dirname(outMd), { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderSummaryReport(payload), 'utf8');

  process.stdout.write(`${toRel(outJson)}\n`);
  process.stdout.write(`${toRel(outMd)}\n`);
  if (payload.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
