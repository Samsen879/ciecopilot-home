#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildGatewayRouteSnapshot } from '../../api/_runtime/gateway-diagnostics.js';

const ROOT = process.cwd();
const RUNS_DIR = path.join(ROOT, 'runs', 'backend');
const DOCS_DIR = path.join(ROOT, 'docs', 'reports');
const ROUTE_JSON_OUT = path.join(RUNS_DIR, 'route_matrix.json');
const AUTH_JSON_OUT = path.join(RUNS_DIR, 'security_authorization_matrix.json');
const GATEWAY_JSON_OUT = path.join(RUNS_DIR, 'gateway_diagnostics.json');
const MD_OUT = path.join(DOCS_DIR, 'phase2_route_matrix.md');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function buildRouteMatrixPayload() {
  return buildGatewayRouteSnapshot({ visibility: 'internal' });
}

export function buildMarkdown(snapshot) {
  const summaryLines = [
    '# Phase2 Route Matrix',
    '',
    `Generated at: ${snapshot.generated_at}`,
    '',
    '## Gateway Summary',
    '',
    '| Metric | Value |',
    '|---|---|',
    `| Route count | ${snapshot.summary.route_count} |`,
    `| Protected routes | ${snapshot.summary.protected_route_count} |`,
    `| Public routes | ${snapshot.summary.public_route_count} |`,
    `| Rate limited routes | ${snapshot.summary.rate_limited_route_count} |`,
    `| Authorization matrix rows | ${snapshot.summary.authorization_matrix_row_count} |`,
    `| Consistency status | ${snapshot.summary.consistency_status} |`,
    '',
    '## Route Matrix',
    '',
    '| Module | Path Prefix | Methods | Auth | Auth Mode | Runtime | Rate Limit | Coverage Actors |',
    '|---|---|---|---|---|---|---|---|',
  ];

  const routeRows = snapshot.routes.map((route) => {
    const methods = Array.isArray(route.methods) ? route.methods.join(', ') : '*';
    const coverageActors = Array.isArray(route.coverageActors)
      ? route.coverageActors.join(', ')
      : '';
    const rateLimit = route.rateLimitPolicyId || (route.hasRateLimit ? 'custom' : 'none');
    return `| ${route.module} | \`${route.pathPrefix}\` | ${methods} | ${route.auth} | ${route.authMode} | ${route.runtime} | ${rateLimit} | ${coverageActors} |`;
  });

  const diagnostics = [
    '',
    '## Diagnostics',
    '',
    `- Missing explicit policies: ${snapshot.summary.routes_missing_explicit_policy.length}`,
    `- Missing rate limit policy ids: ${snapshot.summary.routes_missing_rate_limit_policy.length}`,
    `- Unknown rate limit policies: ${snapshot.summary.routes_with_unknown_rate_limit_policy.length}`,
    `- Auth mode mismatches: ${snapshot.summary.routes_with_auth_mode_mismatch.length}`,
    '',
    '## Legacy Excluded Endpoints',
    ...snapshot.legacy_excluded.map((pathPrefix) => `- \`${pathPrefix}\``),
    '',
    'Full JSON artifacts:',
    '- `runs/backend/route_matrix.json`',
    '- `runs/backend/security_authorization_matrix.json`',
    '- `runs/backend/gateway_diagnostics.json`',
    '',
  ];

  return [...summaryLines, ...routeRows, ...diagnostics].join('\n');
}

export function writeRouteMatrixArtifacts(snapshot) {
  ensureDir(RUNS_DIR);
  ensureDir(DOCS_DIR);

  fs.writeFileSync(ROUTE_JSON_OUT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    AUTH_JSON_OUT,
    `${JSON.stringify(snapshot.authorization_matrix, null, 2)}\n`,
    'utf8',
  );
  fs.writeFileSync(
    GATEWAY_JSON_OUT,
    `${JSON.stringify({ generated_at: snapshot.generated_at, summary: snapshot.summary }, null, 2)}\n`,
    'utf8',
  );
  fs.writeFileSync(MD_OUT, `${buildMarkdown(snapshot)}\n`, 'utf8');

  return {
    route_matrix: ROUTE_JSON_OUT,
    authorization_matrix: AUTH_JSON_OUT,
    gateway_diagnostics: GATEWAY_JSON_OUT,
    markdown: MD_OUT,
  };
}

export function main() {
  const outputs = writeRouteMatrixArtifacts(buildRouteMatrixPayload());
  process.stdout.write(
    [outputs.route_matrix, outputs.authorization_matrix, outputs.gateway_diagnostics, outputs.markdown].join(
      '\n',
    ) + '\n',
  );
}

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryHref && import.meta.url === entryHref) {
  main();
}

