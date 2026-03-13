#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadJsonArtifact, loadProductionEvidenceBundle } from './lib/production-evidence-bundle.js';
import {
  buildProductionEvidenceIngestPreflight,
  renderProductionEvidenceIngestPreflightReport,
} from './lib/production-evidence-ingest-preflight.js';

const ROOT = process.cwd();
const __filename = fileURLToPath(import.meta.url);

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

function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  if (!cli.manifest) {
    throw new Error('manifest path is required');
  }
  const whitelistRelPath = cli.whitelist || 'data/evidence/production/whitelist_v1.json';
  const { manifest, items } = loadProductionEvidenceBundle({ root: ROOT, manifestPath: cli.manifest });
  const { payload: whitelist } = loadJsonArtifact({ root: ROOT, filePath: whitelistRelPath });
  const payload = buildProductionEvidenceIngestPreflight({
    rootDir: ROOT,
    manifest,
    items,
    manifestPath: cli.manifest,
    whitelist,
  });

  const outJson = cli['out-json'] ? path.join(ROOT, cli['out-json']) : null;
  const outMd = cli['out-md'] ? path.join(ROOT, cli['out-md']) : null;

  if (outJson) {
    fs.mkdirSync(path.dirname(outJson), { recursive: true });
    fs.writeFileSync(outJson, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }
  if (outMd) {
    fs.mkdirSync(path.dirname(outMd), { recursive: true });
    fs.writeFileSync(outMd, renderProductionEvidenceIngestPreflightReport(payload), 'utf8');
  }

  if (outJson) process.stdout.write(`${outJson}\n`);
  if (outMd) process.stdout.write(`${outMd}\n`);
  if (payload.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
