#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildProductionEvidenceGovernanceStatus,
  renderProductionEvidenceGovernanceStatusReport,
} from './lib/production-evidence-governance-status.js';
import { loadJsonArtifact } from './lib/production-evidence-bundle.js';

const ROOT = process.cwd();
const __filename = fileURLToPath(import.meta.url);
const DEFAULT_MANIFEST_CHECK = 'runs/backend/rag_phase_b_production_evidence_seed_check.json';
const DEFAULT_WHITELIST_CHECK = 'runs/backend/rag_phase_b_production_evidence_whitelist_check.json';
const DEFAULT_RELEASE_GATE = 'runs/backend/rag_phase_b_production_evidence_release_gate.json';
const DEFAULT_INGEST_PREFLIGHT = 'runs/backend/rag_phase_b_production_evidence_ingest_preflight.json';
const DEFAULT_WHITELIST = 'data/evidence/production/whitelist_v1.json';
const DEFAULT_RUNBOOK = 'docs/reports/rag_phase_b_production_evidence_runbook_20260313.md';
const DEFAULT_OUT_JSON = 'runs/backend/rag_phase_b_production_evidence_governance_status.json';
const DEFAULT_OUT_MD = 'docs/reports/rag_phase_b_production_evidence_governance_status.md';

function parseCliArgs(args) {
  const out = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('-')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      out[token.slice(token.startsWith('--') ? 2 : 1, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(token.startsWith('--') ? 2 : 1);
    const next = args[index + 1];
    if (next && !next.startsWith('-')) {
      out[key] = next;
      index += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function resolveArtifact(root, filePath) {
  const resolved = path.resolve(root, filePath || '');
  return {
    path: filePath,
    resolved,
    exists: Boolean(filePath) && fs.existsSync(resolved),
  };
}

function loadOptionalJson({ root, filePath }) {
  const artifact = resolveArtifact(root, filePath);
  return {
    artifact: {
      path: artifact.path,
      exists: artifact.exists,
    },
    payload: artifact.exists ? loadJsonArtifact({ root, filePath }).payload : null,
  };
}

function selectReleaseGateBundle(payload = {}, manifestPath = '') {
  const bundles = Array.isArray(payload.bundle_results) ? payload.bundle_results : [];
  if (bundles.length === 0) return null;
  if (!manifestPath) return bundles[0];
  return (
    bundles.find((item) => item?.summary?.manifest_path === manifestPath)
    || bundles[0]
  );
}

export function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  const manifestCheckPath = cli['manifest-check'] || DEFAULT_MANIFEST_CHECK;
  const whitelistCheckPath = cli['whitelist-check'] || DEFAULT_WHITELIST_CHECK;
  const releaseGatePath = cli['release-gate'] || DEFAULT_RELEASE_GATE;
  const ingestPreflightPath = cli['ingest-preflight'] || DEFAULT_INGEST_PREFLIGHT;
  const whitelistPath = cli.whitelist || DEFAULT_WHITELIST;
  const runbookPath = cli.runbook || DEFAULT_RUNBOOK;
  const outJsonRelPath = cli['out-json'] || DEFAULT_OUT_JSON;
  const outMdRelPath = cli['out-md'] || DEFAULT_OUT_MD;

  const manifestCheckResult = loadOptionalJson({ root: ROOT, filePath: manifestCheckPath });
  const whitelistCheckResult = loadOptionalJson({ root: ROOT, filePath: whitelistCheckPath });
  const releaseGateResult = loadOptionalJson({ root: ROOT, filePath: releaseGatePath });
  const ingestPreflightResult = loadOptionalJson({ root: ROOT, filePath: ingestPreflightPath });

  const targetManifestPath =
    manifestCheckResult.payload?.manifest
    || whitelistCheckResult.payload?.manifest
    || cli.manifest
    || '';

  const payload = buildProductionEvidenceGovernanceStatus({
    requiredArtifacts: {
      runbook: resolveArtifact(ROOT, runbookPath),
      whitelist: resolveArtifact(ROOT, whitelistPath),
      manifest_check: manifestCheckResult.artifact,
      whitelist_check: whitelistCheckResult.artifact,
      release_gate: releaseGateResult.artifact,
      ingest_preflight: ingestPreflightResult.artifact,
    },
    manifestCheck: manifestCheckResult.payload,
    whitelistCheck: whitelistCheckResult.payload,
    releaseGate: selectReleaseGateBundle(releaseGateResult.payload, targetManifestPath),
    ingestPreflight: ingestPreflightResult.payload,
  });

  const outJson = path.join(ROOT, outJsonRelPath);
  const outMd = path.join(ROOT, outMdRelPath);
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.mkdirSync(path.dirname(outMd), { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderProductionEvidenceGovernanceStatusReport(payload), 'utf8');

  process.stdout.write(`${toRel(outJson)}\n`);
  process.stdout.write(`${toRel(outMd)}\n`);
  if (payload.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
