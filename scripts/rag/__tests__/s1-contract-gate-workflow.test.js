import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const workflowPath = path.join(ROOT, '.github', 'workflows', 'rag-s1-contract-gate.yml');

describe('s1 contract gate workflow triggers', () => {
  test('required workflow triggers for learning-runtime evidence-only PRs', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('- "data/learning_runtime/release_evidence/**"');
    expect(workflow).toContain('- "docs/reports/learning_runtime*.md"');
    expect(workflow).toContain('- "docs/reports/*learning-runtime*.md"');
  });
});
