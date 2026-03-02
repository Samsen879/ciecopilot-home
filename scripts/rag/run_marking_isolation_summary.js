#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MARKING_DIR = path.join(ROOT, 'api', 'marking');
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_marking_isolation_summary.json');

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

function main() {
  const files = walkJsFiles(MARKING_DIR);
  const offenders = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (/\/api\/rag\//.test(content) || /from ['"].*\/rag\//.test(content) || /import\(['"].*\/rag\//.test(content)) {
      offenders.push(path.relative(ROOT, file).replace(/\\/g, '/'));
    }
  }

  const payload = {
    generated_at: new Date().toISOString(),
    files_scanned: files.length,
    offenders,
    pass: offenders.length === 0,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n`);
  if (!payload.pass) process.exit(1);
}

main();

