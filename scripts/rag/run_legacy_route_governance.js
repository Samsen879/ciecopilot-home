#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ROUTE_FILE = path.join(ROOT, 'api', 'ai', 'tutor', 'chat.js');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_legacy_route_governance.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_legacy_route_governance.md');

function main() {
  const routeExists = fs.existsSync(ROUTE_FILE);
  const routeContent = routeExists ? fs.readFileSync(ROUTE_FILE, 'utf8') : '';
  const migrationFiles = fs.existsSync(MIGRATIONS_DIR) ? fs.readdirSync(MIGRATIONS_DIR) : [];
  const rpcReferences = migrationFiles.filter((name) => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
    return content.includes('search_knowledge_chunks');
  });

  const payload = {
    generated_at: new Date().toISOString(),
    route_file: 'api/ai/tutor/chat.js',
    route_exists: routeExists,
    references_search_knowledge_chunks: routeContent.includes("rpc('search_knowledge_chunks'"),
    rpc_defined_in_migrations: rpcReferences.length > 0,
    rpc_migration_hits: rpcReferences,
    canonical_rag_route: 'api/rag/* -> hybrid_search_v2 -> public.chunks',
    governance_state: 'deprecated_not_yet_removed',
    conclusion: 'Legacy tutor route remains in the route registry but depends on an RPC that is not present in repository migrations.',
  };

  const report = [
    '# RAG Legacy Route Governance',
    '',
    `- Generated at: \`${payload.generated_at}\``,
    `- route_file: \`${payload.route_file}\``,
    `- references_search_knowledge_chunks: \`${payload.references_search_knowledge_chunks}\``,
    `- rpc_defined_in_migrations: \`${payload.rpc_defined_in_migrations}\``,
    `- governance_state: \`${payload.governance_state}\``,
    '',
    '## Conclusion',
    '',
    `- ${payload.conclusion}`,
    '',
    '## Canonical Route',
    '',
    `- \`${payload.canonical_rag_route}\``,
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, `${report}\n`, 'utf8');
  process.stdout.write(`${OUT_JSON}\n${OUT_MD}\n`);
}

main();
