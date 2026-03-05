#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { listRoutes, LEGACY_EXCLUDED_ENDPOINTS } from '../../api/_runtime/route-registry.js';

const ROOT = process.cwd();
const RUNS_DIR = path.join(ROOT, 'runs', 'backend');
const DOCS_DIR = path.join(ROOT, 'docs', 'reports');
const JSON_OUT = path.join(RUNS_DIR, 'route_matrix.json');
const MD_OUT = path.join(DOCS_DIR, 'phase2_route_matrix.md');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildMarkdown(routes) {
  const header = [
    '# Phase2 Route Matrix',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    '| Module | Path Prefix | Methods | Auth | Runtime | Own Method Routing | Rate Limit |',
    '|---|---|---|---|---|---|---|',
  ];

  const rows = routes.map((r) => {
    const methods = Array.isArray(r.methods) ? r.methods.join(', ') : '*';
    return `| ${r.module} | \`${r.pathPrefix}\` | ${methods} | ${r.auth} | ${r.runtime} | ${r.moduleOwnsMethodRouting ? 'yes' : 'no'} | ${r.hasRateLimit ? 'yes' : 'no'} |`;
  });

  const legacy = [
    '',
    '## Legacy Excluded Endpoints',
    ...LEGACY_EXCLUDED_ENDPOINTS.map((p) => `- \`${p}\``),
    '',
  ];
  return [...header, ...rows, ...legacy].join('\n');
}

function main() {
  const routes = listRoutes();
  const payload = {
    generated_at: new Date().toISOString(),
    total: routes.length,
    routes,
    legacy_excluded: LEGACY_EXCLUDED_ENDPOINTS,
  };

  ensureDir(RUNS_DIR);
  ensureDir(DOCS_DIR);

  fs.writeFileSync(JSON_OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(MD_OUT, `${buildMarkdown(routes)}\n`, 'utf8');

  process.stdout.write(`${JSON_OUT}\n${MD_OUT}\n`);
}

main();

