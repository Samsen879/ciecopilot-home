#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, 'api');
const OUT_DIR = path.join(ROOT, 'runs', 'backend');
const OUT_FILE = path.join(OUT_DIR, 'preflight_baseline.json');

const MODULE_ENTRYPOINTS = {
  auth: ['api/auth/index.js'],
  users: ['api/users/index.js', 'api/users/profile.js', 'api/users/permissions.js'],
  recommendations: ['api/recommendations/index.js'],
  community: ['api/community/index.js'],
  ai: ['api/ai/tutor/chat.js', 'api/ai/analysis/knowledge-gaps.js', 'api/ai/learning/path-generator.js'],
  rag: ['api/rag/search.js', 'api/rag/chat.js'],
  marking: ['api/marking/evaluate-v1.js', 'api/marking/evaluate.js'],
  'error-book': ['api/error-book/index.js', 'api/error-book/[id].js'],
  evidence: ['api/evidence/context.js'],
};

function walkJsFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      out.push(...walkJsFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

function read(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function toPosix(relPath) {
  return relPath.split(path.sep).join('/');
}

function lineCountMatch(content, pattern) {
  let count = 0;
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (pattern.test(lines[i])) count += 1;
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

function parseApiIndexRouteBaseline() {
  const indexPath = path.join(API_DIR, 'index.js');
  const content = read(indexPath);
  const availableModules = [...content.matchAll(/case\s+'([^']+)':/g)].map((m) => m[1]);
  return {
    file: 'api/index.js',
    exists: fs.existsSync(indexPath),
    uses_create_server: /http\.createServer\(/.test(content),
    uses_split_query_strip: /split\('\?'\)\[0\]/.test(content),
    under_development_occurrences: lineCountMatch(content, /under_development/),
    wildcard_cors: /Access-Control-Allow-Origin['"],\s*['"]\*/.test(content),
    available_modules: [...new Set(availableModules)],
  };
}

function buildModuleFormatSnapshot(apiFiles) {
  const items = apiFiles.map((absPath) => {
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
    cjs_or_mixed: items.filter((x) => x.format === 'cjs' || x.format === 'mixed'),
  };
}

function buildSupabaseInitSnapshot(apiFiles) {
  const findings = [];
  for (const absPath of apiFiles) {
    const rel = toPosix(path.relative(ROOT, absPath));
    const content = read(absPath);
    if (!/createClient\(/.test(content)) continue;

    const envVars = [...content.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]);
    const uniqueEnvVars = [...new Set(envVars)];
    const hasVite = uniqueEnvVars.some((v) => v.startsWith('VITE_'));
    const usesServiceRole = uniqueEnvVars.includes('SUPABASE_SERVICE_ROLE_KEY') || uniqueEnvVars.includes('SUPABASE_SERVICE_ROLE');
    const usesAnon = uniqueEnvVars.includes('SUPABASE_ANON_KEY') || uniqueEnvVars.includes('VITE_SUPABASE_ANON_KEY');

    findings.push({
      file: rel,
      env_vars: uniqueEnvVars,
      uses_vite_env: hasVite,
      uses_service_role: usesServiceRole,
      uses_anon_key: usesAnon,
    });
  }

  return {
    total_create_client_sites: findings.length,
    sites: findings,
  };
}

function hasStrongAuth(content) {
  return (
    /\bresolveUserId\s*\(/.test(content) ||
    /\bauthenticateToken\s*\(/.test(content) ||
    /\bauthGuard\b/.test(content) ||
    /\brequireJwt\s*:\s*true/.test(content)
  );
}

function hasTokenInspection(content) {
  return /Authorization|authorization|Bearer /.test(content);
}

function hasWildcardCors(content) {
  return /Access-Control-Allow-Origin['"],\s*['"]\*/.test(content);
}

function buildSecurityBaseline() {
  const moduleRows = [];
  const risks = [];

  for (const [moduleName, files] of Object.entries(MODULE_ENTRYPOINTS)) {
    const rows = files.map((relFile) => {
      const abs = path.join(ROOT, relFile);
      const content = read(abs);
      return {
        file: relFile,
        exists: fs.existsSync(abs),
        has_strong_auth: hasStrongAuth(content),
        has_token_inspection: hasTokenInspection(content),
        wildcard_cors: hasWildcardCors(content),
      };
    });

    const authCovered = rows.some((r) => r.has_strong_auth);
    const tokenInspected = rows.some((r) => r.has_token_inspection);
    const wildcardCors = rows.some((r) => r.wildcard_cors);

    if (!authCovered && tokenInspected) {
      risks.push({
        severity: 'high',
        module: moduleName,
        issue: 'token检查存在但缺少统一强认证守卫',
      });
    } else if (!authCovered && !tokenInspected) {
      risks.push({
        severity: 'critical',
        module: moduleName,
        issue: '未发现JWT鉴权实现',
      });
    }

    if (wildcardCors) {
      risks.push({
        severity: 'high',
        module: moduleName,
        issue: '存在Access-Control-Allow-Origin=*',
      });
    }

    moduleRows.push({
      module: moduleName,
      auth_covered: authCovered,
      token_inspection_present: tokenInspected,
      wildcard_cors_present: wildcardCors,
      files: rows,
    });
  }

  return {
    modules: moduleRows,
    risks,
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function main() {
  const apiFiles = walkJsFiles(API_DIR);

  const report = {
    generated_at: new Date().toISOString(),
    route_baseline: parseApiIndexRouteBaseline(),
    module_format_snapshot: buildModuleFormatSnapshot(apiFiles),
    supabase_init_snapshot: buildSupabaseInitSnapshot(apiFiles),
    security_baseline_snapshot: buildSecurityBaseline(),
  };

  ensureDir(OUT_DIR);
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`${OUT_FILE}\n`);
}

main();
