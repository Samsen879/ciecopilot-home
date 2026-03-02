#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const API_ROOT = path.join(ROOT, 'api');
const FACTORY_FILE = path.join(API_ROOT, 'lib', 'supabase', 'client.js');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      walk(full, acc);
      continue;
    }
    if (entry.isFile() && full.endsWith('.js')) acc.push(full);
  }
  return acc;
}

function replaceCreateClientCalls(content) {
  const token = 'createClient(';
  let idx = content.indexOf(token);
  if (idx < 0) return content;

  let result = '';
  let cursor = 0;
  while (idx >= 0) {
    result += content.slice(cursor, idx);
    let i = idx + token.length;
    let depth = 1;
    while (i < content.length && depth > 0) {
      const ch = content[i];
      if (ch === '(') depth += 1;
      if (ch === ')') depth -= 1;
      i += 1;
    }
    result += 'getServiceClient()';
    cursor = i;
    idx = content.indexOf(token, cursor);
  }
  result += content.slice(cursor);
  return result;
}

function normalizeEnv(content) {
  return content
    .replaceAll('process.env.VITE_SUPABASE_URL', 'process.env.SUPABASE_URL')
    .replaceAll('process.env.VITE_SUPABASE_SERVICE_ROLE_KEY', 'process.env.SUPABASE_SERVICE_ROLE_KEY')
    .replaceAll('process.env.VITE_SUPABASE_ANON_KEY', 'process.env.SUPABASE_ANON_KEY');
}

function replaceSupabaseImport(filePath, content) {
  if (!content.includes('@supabase/supabase-js')) return content;
  const rel = path.relative(path.dirname(filePath), FACTORY_FILE).replaceAll('\\', '/');
  const relImport = rel.startsWith('.') ? rel : `./${rel}`;
  const replacedImport = content
    .replace(/import\s*\{\s*createClient\s*\}\s*from\s*'@supabase\/supabase-js';?/g, `import { getServiceClient } from '${relImport}';`)
    .replace(/import\s*\{\s*createClient\s*\}\s*from\s*"@supabase\/supabase-js";?/g, `import { getServiceClient } from '${relImport}';`);
  return replaceCreateClientCalls(replacedImport);
}

function main() {
  const files = walk(API_ROOT).filter((f) => f !== FACTORY_FILE);
  let changed = 0;
  const touched = [];

  for (const filePath of files) {
    const original = fs.readFileSync(filePath, 'utf8');
    let next = normalizeEnv(original);
    next = replaceSupabaseImport(filePath, next);
    if (next !== original) {
      fs.writeFileSync(filePath, next, 'utf8');
      changed += 1;
      touched.push(path.relative(ROOT, filePath).replaceAll('\\', '/'));
    }
  }

  const summary = {
    changed_files: changed,
    touched,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
