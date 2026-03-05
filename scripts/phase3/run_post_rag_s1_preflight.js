#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { listRoutes } from '../../api/_runtime/route-registry.js';
import { listRoutePolicies } from '../../api/lib/security/policy-registry.js';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'runs', 'backend', 'post_rag_s1_preflight.json');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function hasArtifact(...segments) {
  return fs.existsSync(path.join(ROOT, ...segments));
}

function main() {
  const routes = listRoutes();
  const protectedRoutes = routes.filter((route) => route.auth === 'jwt_required');
  const rateLimitedRoutes = routes.filter((route) => route.hasRateLimit);
  const policySnapshot = listRoutePolicies(routes);

  const payload = {
    generated_at: new Date().toISOString(),
    route_count: routes.length,
    protected_route_count: protectedRoutes.length,
    protected_modules: protectedRoutes.map((route) => route.module),
    rate_limited_modules: rateLimitedRoutes.map((route) => route.module),
    policy_snapshot: policySnapshot,
    artifact_presence: {
      rag_s1_contract_gate_summary: hasArtifact(
        'runs',
        'backend',
        'rag_s1_contract_gate_summary.json',
      ),
      rag_s1_metric_gate_summary: hasArtifact(
        'runs',
        'backend',
        'rag_s1_metric_gate_summary.json',
      ),
      phase2_route_matrix: hasArtifact('docs', 'reports', 'phase2_route_matrix.md'),
      security_baseline_report: hasArtifact(
        'runs',
        'backend',
        'security_baseline_report.json',
      ),
    },
  };

  ensureDir(OUT);
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT}\n`);
}

main();
