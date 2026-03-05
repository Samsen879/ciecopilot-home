#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  buildS12Dataset,
  buildS12Manifest,
  normalizeSourceNodes,
  S1_2_QUERY_FAMILIES,
  S1_2_EXPECTED_BEHAVIORS,
  S1_2_RISK_FAMILIES,
  S1_2_GOLD_LABEL_SOURCE,
} from './lib/s1_2_dataset.js';

const ROOT = process.cwd();
const SOURCE_FILE = path.join(ROOT, 'data', 'eval', 'rag_live_set_v1.json');
const OUT_FILE = path.join(ROOT, 'data', 'eval', 'rag_s1_2_syllabus_qa_core_v1.json');
const MANIFEST_FILE = path.join(ROOT, 'data', 'eval', 'rag_s1_2_syllabus_qa_core_v1_manifest.json');

function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error(`Source dataset not found: ${SOURCE_FILE}`);
  }

  const sourceCases = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
  const sourceNodes = normalizeSourceNodes(sourceCases, { maxNodes: 30 });
  const cases = buildS12Dataset(sourceNodes);
  const manifest = buildS12Manifest(cases, {
    datasetPath: path.relative(ROOT, OUT_FILE).replace(/\\/g, '/'),
    sourceNodeCount: sourceNodes.length,
  });

  if (cases.length < 200) {
    throw new Error(`S1.2 dataset must contain at least 200 cases, got ${cases.length}`);
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(cases, null, 2)}\n`, 'utf8');
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  process.stdout.write(
    `${OUT_FILE}\n${MANIFEST_FILE}\n` +
      `${JSON.stringify(
        {
          total_cases: cases.length,
          source_node_count: sourceNodes.length,
          query_families: S1_2_QUERY_FAMILIES,
          expected_behaviors: S1_2_EXPECTED_BEHAVIORS,
          risk_families: S1_2_RISK_FAMILIES,
          gold_label_source: S1_2_GOLD_LABEL_SOURCE,
        },
        null,
        2,
      )}\n`,
  );
}

main();
