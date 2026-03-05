import fs from 'node:fs';
import path from 'node:path';
import {
  buildS12Dataset,
  buildS12Manifest,
  buildS12Strata,
  normalizeSourceNodes,
  S1_2_QUERY_FAMILIES,
  S1_2_EXPECTED_BEHAVIORS,
} from '../lib/s1_2_dataset.js';

const ROOT = process.cwd();
const LIVE_SET = path.join(ROOT, 'data', 'eval', 'rag_live_set_v1.json');

describe('S1.2 dataset builder', () => {
  it('builds a >=200 case dataset with every required family covered', () => {
    const liveCases = JSON.parse(fs.readFileSync(LIVE_SET, 'utf8'));
    const sourceNodes = normalizeSourceNodes(liveCases, { maxNodes: 30 });
    const cases = buildS12Dataset(sourceNodes);

    expect(cases.length).toBeGreaterThanOrEqual(200);
    expect(new Set(cases.map((item) => item.query_family))).toEqual(new Set(S1_2_QUERY_FAMILIES));
    expect(new Set(cases.map((item) => item.expected_behavior))).toEqual(new Set(S1_2_EXPECTED_BEHAVIORS));
    expect(cases.every((item) => typeof item.expected_behavior === 'string' && item.expected_behavior.length > 0)).toBe(
      true,
    );
  });

  it('builds a manifest whose strata match the dataset', () => {
    const liveCases = JSON.parse(fs.readFileSync(LIVE_SET, 'utf8'));
    const sourceNodes = normalizeSourceNodes(liveCases, { maxNodes: 30 });
    const cases = buildS12Dataset(sourceNodes);
    const manifest = buildS12Manifest(cases, {
      datasetPath: 'data/eval/rag_s1_2_syllabus_qa_core_v1.json',
      sourceNodeCount: sourceNodes.length,
    });

    expect(manifest.total_cases).toBe(cases.length);
    expect(manifest.strata).toEqual(buildS12Strata(cases));
  });
});
