#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { summarizeCorpusSchemaCompat } from './lib/corpus-schema-compat.js';

const ROOT = process.cwd();
const MIGRATION_FILE = path.join(ROOT, 'supabase', 'migrations', '20260302190000_chunks_add_corpus_contract.sql');
const HYBRID_FILE = path.join(ROOT, 'supabase', 'migrations', '20260118093200_recreate_hybrid_search_v2.sql');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_canonical_schema_compat_smoke.json');

function main() {
  const summary = summarizeCorpusSchemaCompat({
    migrationSql: fs.readFileSync(MIGRATION_FILE, 'utf8'),
    hybridSql: fs.readFileSync(HYBRID_FILE, 'utf8'),
  });

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_JSON}\n`);
}

main();
