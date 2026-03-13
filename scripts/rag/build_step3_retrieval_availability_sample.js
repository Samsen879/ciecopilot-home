#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const SOURCE_DATASET = path.join(ROOT, 'data', 'eval', 'rag_s2_augmentation_eval_v1.json');

const ROOT_PRIORITY_BY_SUBJECT = Object.freeze({
  '9709': ['9709', '9709.P1', '9709.P2', '9709.P3', '9709.M1', '9709.S1', '9709.S2', '9709.M'],
  '9702': ['9702', '9702.P1', '9702.P2', '9702.P3', '9702.P4', '9702.P5'],
  '9231': ['9231', '9231.FP1', '9231.FP2', '9231.FM', '9231.FS'],
});

const SLICE_PRIORITY = Object.freeze([
  'cross_topic',
  'prerequisite_chain',
  'global_planning',
]);

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

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function resolveCliPath(value, fallbackRelativePath) {
  if (!value) return path.join(ROOT, fallbackRelativePath);
  return path.isAbsolute(value) ? value : path.join(ROOT, value);
}

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset not found: ${filePath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`Dataset must be an array: ${filePath}`);
  }
  return parsed;
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = String(keyFn(item) || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function deriveRoot(topicPath) {
  const value = String(topicPath || '').trim();
  if (!value) return 'unknown';
  const parts = value.split('.').filter(Boolean);
  if (parts.length <= 1) return value;
  return `${parts[0]}.${parts[1]}`;
}

function withDerivedRoot(item) {
  return {
    ...item,
    __derived_root: deriveRoot(item.current_topic_path),
  };
}

export function getRootPriority(subjectCode) {
  return ROOT_PRIORITY_BY_SUBJECT[subjectCode] || [subjectCode];
}

export function buildCorpusScopePolicy(subjectCode) {
  return {
    mode: 'subject_scoped',
    compatible_subject_codes: [subjectCode],
    allow_mixed_subject_corpus_versions: false,
  };
}

export function selectCases(candidates, limit, { rootPriority = [] } = {}) {
  const selected = [];
  const used = new Set();

  function tryAdd(predicate) {
    const found = candidates.find((item) => !used.has(item.case_id) && predicate(item));
    if (!found) return false;
    used.add(found.case_id);
    selected.push(found);
    return true;
  }

  for (const root of rootPriority) {
    for (const slice of SLICE_PRIORITY) {
      if (selected.length >= limit) break;
      tryAdd((item) => item.__derived_root === root && item.target_slice === slice);
    }
    if (selected.length >= limit) break;
  }

  if (selected.length < limit) {
    for (const item of candidates) {
      if (selected.length >= limit) break;
      if (used.has(item.case_id)) continue;
      used.add(item.case_id);
      selected.push(item);
    }
  }

  return selected.map(({ __derived_root, ...rest }) => ({
    ...rest,
    metadata: {
      ...(rest.metadata || {}),
      step3_validation_root: __derived_root,
      step3_validation_profile: 'production_availability_sample',
    },
  }));
}

export function buildManifest({ subjectCode, selected, limit, rootPriority }) {
  return {
    generated_at: new Date().toISOString(),
    subject_code: subjectCode,
    subject_scope: 'single_subject',
    subject_codes: [subjectCode],
    corpus_scope_policy: buildCorpusScopePolicy(subjectCode),
    source_dataset: toRel(SOURCE_DATASET),
    total_cases: selected.length,
    requested_limit: limit,
    roots_priority: rootPriority,
    slices_priority: SLICE_PRIORITY,
    coverage: {
      derived_root: countBy(selected, (item) => item.metadata?.step3_validation_root || 'unknown'),
      target_slice: countBy(selected, (item) => item.target_slice || 'unknown'),
    },
    notes: [
      'This sample reuses the existing S2 augmentation eval dataset and narrows it to the current Step 3 production-availability pilot.',
      'It is intended to verify retrieval availability, not to replace the formal balanced_profile rerun.',
    ],
  };
}

export function buildStep3RetrievalAvailabilitySample(argv = parseCliArgs(process.argv.slice(2))) {
  const subjectCode = String(argv.subject || '9709').trim();
  const limit = toPositiveInt(argv.limit, 20);
  const rootPriority = getRootPriority(subjectCode);
  const outDataset = resolveCliPath(
    argv['out-dataset'],
    `data/eval/rag_step3_retrieval_availability_sample_${subjectCode}.json`,
  );
  const outManifest = resolveCliPath(
    argv['out-manifest'],
    `data/eval/rag_step3_retrieval_availability_sample_${subjectCode}_manifest.json`,
  );

  const source = readJsonArray(SOURCE_DATASET)
    .filter((item) => String(item.subject_code || '').trim() === subjectCode)
    .map(withDerivedRoot);

  if (source.length === 0) {
    throw new Error(`No source cases found for subject ${subjectCode}`);
  }

  const selected = selectCases(source, limit, { rootPriority });
  const manifest = buildManifest({ subjectCode, selected, limit, rootPriority });

  fs.mkdirSync(path.dirname(outDataset), { recursive: true });
  fs.mkdirSync(path.dirname(outManifest), { recursive: true });
  fs.writeFileSync(outDataset, `${JSON.stringify(selected, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outManifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return {
    outDataset,
    outManifest,
    selected,
    manifest,
  };
}

function main() {
  const { outDataset, outManifest } = buildStep3RetrievalAvailabilitySample();
  process.stdout.write(`${outDataset}\n${outManifest}\n`);
}

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
