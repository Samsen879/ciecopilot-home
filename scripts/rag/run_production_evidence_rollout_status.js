#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildProductionEvidenceRolloutStatus,
  renderProductionEvidenceRolloutStatusReport,
} from './lib/production-evidence-rollout-status.js';

const ROOT = process.cwd();
const __filename = fileURLToPath(import.meta.url);
const DEFAULT_ROLLOUT_GATE_ARTIFACT = 'runs/backend/rag_phase_b_production_evidence_rollout_gate.json';
const DEFAULT_VERIFICATION_MAPPINGS = [
  {
    bundle_id: 'phase_b_pilot_ready_v1',
    subject_codes: ['9702'],
    path: 'runs/backend/rag_phase_b_first_online_rollout_9702.json',
  },
];
const DEFAULT_OUT_JSON = 'runs/backend/rag_phase_b_production_evidence_rollout_status.json';
const DEFAULT_OUT_MD = 'docs/reports/rag_phase_b_production_evidence_rollout_status.md';

function parseCliArgs(args) {
  const out = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('-')) continue;
    const eq = token.indexOf('=');
    const key = token.slice(token.startsWith('--') ? 2 : 1, eq !== -1 ? eq : undefined);
    const value =
      eq !== -1
        ? token.slice(eq + 1)
        : args[index + 1] && !args[index + 1].startsWith('-')
          ? args[++index]
          : true;
    if (Object.hasOwn(out, key)) {
      out[key] = Array.isArray(out[key]) ? [...out[key], value] : [out[key], value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function toList(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === false) return fallback;
  return [value];
}

function describeArtifact(filePath) {
  const resolved = filePath ? resolveCliPath(filePath) : null;
  return {
    path: resolved ? toRel(resolved) : null,
    exists: Boolean(resolved) && fs.existsSync(resolved),
    resolved,
  };
}

export function resolveCliPath(inputPath) {
  if (!inputPath) return null;
  return path.isAbsolute(inputPath) ? inputPath : path.join(ROOT, inputPath);
}

export function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  const rolloutGateArtifactPath = resolveCliPath(cli['rollout-gate-artifact'] || DEFAULT_ROLLOUT_GATE_ARTIFACT);
  if (!rolloutGateArtifactPath || !fs.existsSync(rolloutGateArtifactPath)) {
    throw new Error('rollout-gate-artifact path is required');
  }

  const rolloutGateArtifact = readJson(rolloutGateArtifactPath);
  const rolloutGateSourcePath = resolveCliPath(cli['rollout-gate'] || rolloutGateArtifact.rollout_gate || '');
  const verificationArtifactPaths = toList(
    cli['verification-artifact'],
    DEFAULT_VERIFICATION_MAPPINGS.map((item) => item.path),
  );

  const sourceArtifacts = {
    rollout_gate_artifact: {
      path: toRel(rolloutGateArtifactPath),
      exists: true,
    },
    rollout_gate: {
      path: rolloutGateSourcePath ? toRel(rolloutGateSourcePath) : null,
      exists: Boolean(rolloutGateSourcePath) && fs.existsSync(rolloutGateSourcePath),
    },
    verification_artifacts: verificationArtifactPaths.map((artifactPath) => {
      const described = describeArtifact(artifactPath);
      return {
        path: described.path,
        exists: described.exists,
      };
    }),
  };

  const payload = buildProductionEvidenceRolloutStatus({
    rolloutGateArtifact,
    rolloutGate:
      sourceArtifacts.rollout_gate.exists === true && rolloutGateSourcePath
        ? readJson(rolloutGateSourcePath)
        : null,
    verificationArtifacts: verificationArtifactPaths.map((artifactPath) => {
      const defaultMapping = DEFAULT_VERIFICATION_MAPPINGS.find((item) => item.path === artifactPath)
        || DEFAULT_VERIFICATION_MAPPINGS[0];
      const resolved = resolveCliPath(artifactPath);
      return {
        bundle_id: defaultMapping?.bundle_id || '',
        subject_codes: defaultMapping?.subject_codes || [],
        path: resolved ? toRel(resolved) : artifactPath,
        payload: resolved && fs.existsSync(resolved) ? readJson(resolved) : null,
      };
    }),
    sourceArtifacts,
  });

  const outJson = resolveCliPath(cli['out-json'] || DEFAULT_OUT_JSON);
  const outMd = resolveCliPath(cli['out-md'] || DEFAULT_OUT_MD);
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.mkdirSync(path.dirname(outMd), { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderProductionEvidenceRolloutStatusReport(payload), 'utf8');

  process.stdout.write(`${toRel(outJson)}\n`);
  process.stdout.write(`${toRel(outMd)}\n`);
  if (payload.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
