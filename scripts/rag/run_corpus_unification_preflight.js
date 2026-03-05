#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'runs', 'backend', 'rag_corpus_unification_preflight.json');

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function main() {
  const payload = {
    generated_at: new Date().toISOString(),
    scope: 'rag-corpus-chunking-unification',
    canonical_reader: {
      api_path: 'api/rag/lib/ask-service.js',
      rpc_path: 'supabase/migrations/20260118093200_recreate_hybrid_search_v2.sql',
      table: 'public.chunks',
      exists: exists('api/rag/lib/ask-service.js') && exists('supabase/migrations/20260118093200_recreate_hybrid_search_v2.sql'),
    },
    legacy_writer: {
      script: 'scripts/rag_ingest.js',
      target_tables: ['public.rag_documents', 'public.rag_chunks', 'public.rag_embeddings'],
      exists: exists('scripts/rag_ingest.js'),
    },
    legacy_route: {
      route_file: 'api/ai/tutor/chat.js',
      expected_rpc: 'search_knowledge_chunks',
      exists: exists('api/ai/tutor/chat.js'),
    },
    artifacts: {
      inventory_json: 'runs/backend/rag_corpus_chain_inventory.json',
      inventory_report: 'docs/reports/rag_corpus_chain_inventory.md',
      signoff: 'docs/reports/rag_corpus_unification_signoff.md',
    },
    guards: {
      default_strategy_must_remain: 'b_simplified_retrieval_s1_v1',
      required_gates_unchanged: [
        'runs/backend/rag_s1_contract_gate_summary.json',
        'runs/backend/rag_s1_metric_gate_summary.json',
      ],
    },
    rollback_boundaries: {
      reader_switch_allowed: false,
      schema_expansion_only: true,
      legacy_table_deletion_allowed: false,
    },
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n`);
}

main();
