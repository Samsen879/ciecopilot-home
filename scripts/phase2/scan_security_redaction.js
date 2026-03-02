#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, 'api');
const OUT = path.join(ROOT, 'runs', 'backend', 'security_redaction_scan.json');

const KEYWORDS = ['token', 'password', 'secret', 'api_key', 'authorization', 'jwt', 'code'];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function findIssues(content, file) {
  const issues = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/console\.(log|warn|error)\(/.test(line)) continue;
    const lower = line.toLowerCase();
    const hit = KEYWORDS.find((k) => lower.includes(k));
    if (!hit) continue;
    const likelyLeak = /\$\{|req\.|body\.|headers|authorization|accesstoken|refreshtoken|verificationcode|resettoken|password_hash|api_key/i.test(line);
    if (!likelyLeak) continue;
    issues.push({
      file,
      line: i + 1,
      severity: 'warn',
      keyword: hit,
      snippet: line.trim().slice(0, 240),
    });
  }
  return issues;
}

function main() {
  const files = walk(API_DIR).map((f) => path.relative(ROOT, f).replaceAll('\\', '/'));
  const issues = [];
  for (const file of files) {
    const abs = path.join(ROOT, file);
    const content = fs.readFileSync(abs, 'utf8');
    issues.push(...findIssues(content, file));
  }

  const payload = {
    generated_at: new Date().toISOString(),
    scanned_files: files.length,
    issue_count: issues.length,
    issues,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT}\n`);
}

main();
