#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildGatewayRouteSnapshot } from '../../api/_runtime/gateway-diagnostics.js';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'runs', 'backend');
const OUT_FILE = path.join(OUT_DIR, 'preflight_baseline.json');
const PLATFORM_SURFACE_PATHS = [
  'api/index.js',
  'api/_runtime',
  'api/lib/security',
  'api/auth',
  'api/users',
  'middleware',
  'api/lib/supabase/client.js',
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function toPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

function read(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function walkPlatformFiles() {
  const files = [];
  for (const relativePath of PLATFORM_SURFACE_PATHS) {
    const absolutePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const stat = fs.statSync(absolutePath);
    if (stat.isFile()) {
      files.push(absolutePath);
      continue;
    }
    files.push(...walkDirectory(absolutePath));
  }
  return [...new Set(files)];
}

function walkDirectory(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      files.push(...walkDirectory(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

function lineCountMatch(content, pattern) {
  let count = 0;
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (pattern.test(line)) count += 1;
  }
  return count;
}

function detectModuleFormat(content) {
  const hasImport = /^\s*import\s.+from\s+['"].+['"];?\s*$/m.test(content);
  const hasExport = /^\s*export\s+(default|const|function|class)\s+/m.test(content);
  const hasRequire = /\brequire\(['"][^'"]+['"]\)/.test(content);
  const hasModuleExports = /\bmodule\.exports\b/.test(content);
  const hasCjs = hasRequire || hasModuleExports;
  const hasEsm = hasImport || hasExport;
  if (hasCjs && hasEsm) return 'mixed';
  if (hasCjs) return 'cjs';
  if (hasEsm) return 'esm';
  return 'plain';
}

function buildModuleFormatSnapshot(platformFiles) {
  const items = platformFiles.map((absPath) => {
    const rel = toPosix(path.relative(ROOT, absPath));
    const content = read(absPath);
    return {
      file: rel,
      format: detectModuleFormat(content),
    };
  });

  const counts = items.reduce((acc, item) => {
    acc[item.format] = (acc[item.format] || 0) + 1;
    return acc;
  }, {});

  return {
    counts,
    cjs_or_mixed: items.filter((item) => item.format === 'cjs' || item.format === 'mixed'),
  };
}

function buildSupabaseInitSnapshot(platformFiles) {
  const findings = [];
  for (const absPath of platformFiles) {
    const rel = toPosix(path.relative(ROOT, absPath));
    const content = read(absPath);
    if (!/createClient\(/.test(content)) continue;

    const envVars = [...content.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((match) => match[1]);
    const uniqueEnvVars = [...new Set(envVars)];
    findings.push({
      file: rel,
      env_vars: uniqueEnvVars,
      uses_service_role:
        uniqueEnvVars.includes('SUPABASE_SERVICE_ROLE_KEY') ||
        uniqueEnvVars.includes('SUPABASE_SERVICE_ROLE'),
      uses_anon_key: uniqueEnvVars.includes('SUPABASE_ANON_KEY'),
    });
  }

  return {
    total_create_client_sites: findings.length,
    sites: findings,
  };
}

function buildRouteBaseline(gatewaySnapshot) {
  const indexPath = path.join(ROOT, 'api', 'index.js');
  const content = read(indexPath);
  return {
    file: 'api/index.js',
    exists: fs.existsSync(indexPath),
    uses_create_server: /http\.createServer\(/.test(content),
    uses_route_registry: /findRoute\(/.test(content),
    uses_gateway_diagnostics: /buildGatewayRouteSnapshot\(/.test(content),
    under_development_occurrences: lineCountMatch(content, /under_development/),
    wildcard_cors: /Access-Control-Allow-Origin['"],\s*['"]\*/.test(content),
    route_count: gatewaySnapshot.summary.route_count,
    protected_route_count: gatewaySnapshot.summary.protected_route_count,
    public_route_count: gatewaySnapshot.summary.public_route_count,
    available_modules: gatewaySnapshot.routes.map((route) => route.module),
  };
}

function buildSecurityBaselineSnapshot(gatewaySnapshot) {
  const issues = [
    ...gatewaySnapshot.summary.routes_missing_explicit_policy.map((module) => ({
      severity: 'high',
      module,
      issue: 'route missing explicit security policy registry entry',
    })),
    ...gatewaySnapshot.summary.routes_missing_rate_limit_policy.map((module) => ({
      severity: 'high',
      module,
      issue: 'rate limited route missing rate limit policy id',
    })),
    ...gatewaySnapshot.summary.routes_with_unknown_rate_limit_policy.map((item) => ({
      severity: 'high',
      module: item,
      issue: 'route references unknown rate limit policy',
    })),
    ...gatewaySnapshot.summary.routes_with_auth_mode_mismatch.map((module) => ({
      severity: 'high',
      module,
      issue: 'route auth mode disagrees with gateway auth setting',
    })),
  ];

  return {
    architecture: {
      mode: 'gateway_centralized',
      gateway_entry: 'api/index.js',
      route_registry: 'api/_runtime/route-registry.js',
      gateway_diagnostics: 'api/_runtime/gateway-diagnostics.js',
      auth_guard: 'api/lib/security/auth-guard.js',
      policy_registry: 'api/lib/security/policy-registry.js',
      rate_limit_guard: 'api/lib/security/rate-limit-middleware.js',
    },
    gateway_summary: gatewaySnapshot.summary,
    route_policies: gatewaySnapshot.routes.map((route) => ({
      module: route.module,
      path_prefix: route.pathPrefix,
      auth: route.auth,
      auth_mode: route.authMode,
      explicit_policy: route.explicitPolicy,
      coverage_actors: route.coverageActors,
      required_roles: route.requiredRoles,
      runtime: route.runtime,
      rate_limit_policy_id: route.rateLimitPolicyId,
      has_rate_limit: route.hasRateLimit,
      verification_strategies: route.verificationStrategies,
    })),
    risks: issues,
  };
}

export function buildPreflightBaselineReport() {
  const gatewaySnapshot = buildGatewayRouteSnapshot({ visibility: 'internal' });
  const platformFiles = walkPlatformFiles();

  return {
    generated_at: new Date().toISOString(),
    route_baseline: buildRouteBaseline(gatewaySnapshot),
    module_format_snapshot: buildModuleFormatSnapshot(platformFiles),
    supabase_init_snapshot: buildSupabaseInitSnapshot(platformFiles),
    security_baseline_snapshot: buildSecurityBaselineSnapshot(gatewaySnapshot),
  };
}

export function main() {
  const report = buildPreflightBaselineReport();
  ensureDir(OUT_DIR);
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n`);
}

const entryHref = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryHref && import.meta.url === entryHref) {
  main();
}

