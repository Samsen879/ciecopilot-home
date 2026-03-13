#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderProductionEvidenceManifestReport,
  validateProductionEvidenceManifest,
} from './lib/production-evidence-manifest.js';

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  const manifestPath = cli.manifest ? path.join(ROOT, cli.manifest) : null;
  if (!manifestPath || !fs.existsSync(manifestPath)) {
    throw new Error('manifest path is required');
  }

  const manifest = readJson(manifestPath);
  const itemsFileToken = typeof manifest.items_file === 'string' ? manifest.items_file.trim() : '';
  const itemsFile = itemsFileToken ? path.join(path.dirname(manifestPath), itemsFileToken) : null;
  let items = manifest.items || [];
  if (itemsFileToken) {
    if (!itemsFile || !fs.existsSync(itemsFile)) {
      throw new Error(`items_file not found: ${itemsFileToken}`);
    }
    items = readJson(itemsFile);
  }
  const result = validateProductionEvidenceManifest({
    manifest,
    items,
  });
  const payload = {
    generated_at: new Date().toISOString(),
    manifest: toRel(manifestPath),
    items_file: itemsFile && fs.existsSync(itemsFile) ? toRel(itemsFile) : null,
    ...result,
  };

  const outJson = cli['out-json'] ? path.join(ROOT, cli['out-json']) : null;
  const outMd = cli['out-md'] ? path.join(ROOT, cli['out-md']) : null;

  if (outJson) {
    fs.mkdirSync(path.dirname(outJson), { recursive: true });
    fs.writeFileSync(outJson, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }
  if (outMd) {
    fs.mkdirSync(path.dirname(outMd), { recursive: true });
    fs.writeFileSync(outMd, renderProductionEvidenceManifestReport(payload), 'utf8');
  }

  if (outJson) process.stdout.write(`${outJson}\n`);
  if (outMd) process.stdout.write(`${outMd}\n`);
  if (!payload.ok) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
