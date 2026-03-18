#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildProductionEvidenceFirstOnlineRolloutVerification,
  renderProductionEvidenceFirstOnlineRolloutVerificationReport,
} from './lib/production-evidence-first-online-rollout-verification.js';

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_ROLLOUT_GATE = 'data/evidence/production/rollout_gate_v1.json';
const DEFAULT_WHITELIST = 'data/evidence/production/whitelist_v1.json';
const DEFAULT_OUT_JSON = 'runs/backend/rag_phase_b_first_online_rollout_9702.json';
const DEFAULT_OUT_MD = 'docs/reports/rag_phase_b_first_online_rollout_9702.md';

function getRoot() {
  return process.cwd();
}

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toRel(filePath) {
  return path.relative(getRoot(), filePath).replace(/\\/g, '/');
}

export function resolveCliPath(inputPath) {
  if (!inputPath) return null;
  return path.isAbsolute(inputPath) ? inputPath : path.join(getRoot(), inputPath);
}

export async function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  const rolloutGatePath = resolveCliPath(cli['rollout-gate'] || DEFAULT_ROLLOUT_GATE);
  const whitelistPath = resolveCliPath(cli.whitelist || DEFAULT_WHITELIST);
  const outJson = resolveCliPath(cli['out-json'] || DEFAULT_OUT_JSON);
  const outMd = resolveCliPath(cli['out-md'] || DEFAULT_OUT_MD);

  if (!rolloutGatePath || !fs.existsSync(rolloutGatePath)) {
    throw new Error('rollout-gate path is required');
  }
  if (!whitelistPath || !fs.existsSync(whitelistPath)) {
    throw new Error('whitelist path is required');
  }

  const payload = await buildProductionEvidenceFirstOnlineRolloutVerification({
    rolloutGate: readJson(rolloutGatePath),
    whitelist: readJson(whitelistPath),
  });

  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.mkdirSync(path.dirname(outMd), { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderProductionEvidenceFirstOnlineRolloutVerificationReport(payload), 'utf8');

  process.stdout.write(`${toRel(outJson)}\n`);
  process.stdout.write(`${toRel(outMd)}\n`);
  if (payload.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
