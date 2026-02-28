import fs from 'node:fs';
import path from 'node:path';

function walkJsFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...walkJsFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

describe('Marking isolation guard', () => {
  it('does not allow Marking modules to call RAG endpoints', () => {
    const markingDir = path.join(process.cwd(), 'api', 'marking');
    const files = walkJsFiles(markingDir);
    const offenders = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (/\/api\/rag\//.test(content) || /from ['"].*\/rag\//.test(content) || /import\(['"].*\/rag\//.test(content)) {
        offenders.push(path.relative(process.cwd(), file));
      }
    }

    expect(offenders).toEqual([]);
  });
});

