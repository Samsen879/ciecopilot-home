import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const workflowPath = path.join(ROOT, '.github', 'workflows', 'rag-s1-metric-gate.yml');

describe('s1 metric gate workflow defaults', () => {
  test('required workflow provides non-empty embedding and chat fallbacks when secrets are unset', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain("VECTOR_EMBEDDING_BASE_URL: ${{ secrets.VECTOR_EMBEDDING_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1' }}");
    expect(workflow).toContain("VECTOR_EMBEDDING_MODEL: ${{ secrets.VECTOR_EMBEDDING_MODEL || 'text-embedding-v4' }}");
    expect(workflow).toContain("CHAT_MODEL: ${{ secrets.CHAT_MODEL || 'qwen-plus' }}");
  });
});
