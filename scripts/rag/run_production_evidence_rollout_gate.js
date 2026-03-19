#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderProductionEvidenceRolloutGateReport,
  validateProductionEvidenceRolloutGate,
} from './lib/production-evidence-rollout-gate.js';
import { resolveCliPathFromRoot } from './lib/cli-paths.js';

const __filename = fileURLToPath(import.meta.url);

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
  return resolveCliPathFromRoot(getRoot(), inputPath);
}

export function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  const rolloutGatePath = resolveCliPath(cli['rollout-gate']);
  const whitelistPath = resolveCliPath(cli.whitelist);

  if (!rolloutGatePath || !fs.existsSync(rolloutGatePath)) {
    throw new Error('rollout-gate path is required');
  }
  if (!whitelistPath || !fs.existsSync(whitelistPath)) {
    throw new Error('whitelist path is required');
  }

  const rolloutGate = readJson(rolloutGatePath);
  const whitelist = readJson(whitelistPath);
  const result = validateProductionEvidenceRolloutGate({
    rolloutGate,
    whitelist,
  });
  const payload = {
    generated_at: new Date().toISOString(),
    rollout_gate: toRel(rolloutGatePath),
    whitelist: toRel(whitelistPath),
    ...result,
  };

  const outJson = resolveCliPath(cli['out-json']);
  const outMd = resolveCliPath(cli['out-md']);

  if (outJson) {
    fs.mkdirSync(path.dirname(outJson), { recursive: true });
    fs.writeFileSync(outJson, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }
  if (outMd) {
    fs.mkdirSync(path.dirname(outMd), { recursive: true });
    fs.writeFileSync(outMd, renderProductionEvidenceRolloutGateReport(payload), 'utf8');
  }

  if (outJson) process.stdout.write(`${outJson}\n`);
  if (outMd) process.stdout.write(`${outMd}\n`);
  if (!payload.ok) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
