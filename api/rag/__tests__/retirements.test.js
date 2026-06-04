import fs from 'node:fs';
import path from 'node:path';

describe('rag legacy retrieval retirements', () => {
  test('does not keep the retired standalone retrievers or weighted rrf helper', () => {
    for (const relativePath of [
      'api/rag/lib/retrievers/dense-retriever.js',
      'api/rag/lib/retrievers/lexical-retriever.js',
      'api/rag/lib/weighted-rrf.js',
      'api/rag/__tests__/weighted-rrf.test.js',
    ]) {
      expect(fs.existsSync(path.join(process.cwd(), relativePath))).toBe(false);
    }
  });

  test('does not run the retired weighted rrf test in the s1 contract gate', () => {
    const gateSource = fs.readFileSync(
      path.join(process.cwd(), 'scripts/rag/run_s1_contract_gate.js'),
      'utf8',
    );

    expect(gateSource).not.toContain('weighted-rrf.test.js');
  });
});
