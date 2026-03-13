#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { buildS2AdvisoryGateSummary } from './lib/s2_advisory_gate.js';

const ROOT = process.cwd();
const S2_EVAL_SUMMARY_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_augmentation_eval_summary.json');
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_advisory_gate_summary.json');

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required artifact missing: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const evalSummary = readJson(S2_EVAL_SUMMARY_FILE);
  const gateSummary = buildS2AdvisoryGateSummary({ evalSummary });
  const output = {
    ...gateSummary,
    inputs: {
      s2_augmentation_eval_summary: toRel(S2_EVAL_SUMMARY_FILE),
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n`);

  if (output.status !== 'pass') process.exit(1);
}

main();
