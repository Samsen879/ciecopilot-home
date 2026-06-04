#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildS2EvalSummarySchemaCheck } from './lib/s2_eval_summary_schema_check.js';

const ROOT = process.cwd();
const DEFAULT_SUMMARY_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_augmentation_eval_summary.json');
const DEFAULT_SCHEMA_FILE = path.join(
  ROOT,
  'docs',
  'schemas',
  'rag_s2_augmentation_eval_summary.schema.json',
);
const DEFAULT_OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_eval_summary_schema_check.json');

function parseArgs(args) {
  const out = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('-')) continue;
    const eqIndex = token.indexOf('=');
    if (eqIndex !== -1) {
      out[token.slice(token.startsWith('--') ? 2 : 1, eqIndex)] = token.slice(eqIndex + 1);
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

function resolveFromRoot(input, fallback) {
  if (!input) return fallback;
  return path.isAbsolute(input) ? input : path.join(ROOT, input);
}

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function main(args = process.argv.slice(2)) {
  const argv = parseArgs(args);
  const summaryFile = resolveFromRoot(argv.summary, DEFAULT_SUMMARY_FILE);
  const schemaFile = resolveFromRoot(argv.schema, DEFAULT_SCHEMA_FILE);
  const outFile = resolveFromRoot(argv.out, DEFAULT_OUT_FILE);
  const schema = readJsonIfExists(schemaFile);
  if (!schema) {
    throw new Error(`Schema missing: ${schemaFile}`);
  }

  const payload = buildS2EvalSummarySchemaCheck({
    evalSummary: readJsonIfExists(summaryFile),
    schema,
    inputs: {
      summary: toRel(summaryFile),
      schema: toRel(schemaFile),
    },
  });

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${toRel(outFile)}\n`);
  return payload.status === 'pass' ? 0 : 1;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  process.exitCode = main();
}
