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

function parseSubjectCodes(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseVerificationMappingSpec(value) {
  const [bundleIdRaw = '', subjectCodesRaw = '', artifactPathRaw = ''] = String(value || '').split('|');
  const bundle_id = bundleIdRaw.trim();
  const subject_codes = parseSubjectCodes(subjectCodesRaw);
  const pathValue = artifactPathRaw.trim();
  if (!bundle_id || subject_codes.length === 0 || !pathValue) {
    throw new Error(
      'verification-mapping must use bundle_id|subject_code[,subject_code...]|artifact_path format',
    );
  }
  return {
    bundle_id,
    subject_codes,
    path: pathValue,
  };
}

function buildVerificationMappings(cli) {
  const explicitMappings = toList(cli['verification-mapping']).map(parseVerificationMappingSpec);
  if (explicitMappings.length > 0) return explicitMappings;

  const verificationArtifactPaths = toList(
    cli['verification-artifact'],
    DEFAULT_VERIFICATION_MAPPINGS.map((item) => item.path),
  );
  return verificationArtifactPaths.map((artifactPath) => {
    const defaultMapping = DEFAULT_VERIFICATION_MAPPINGS.find((item) => item.path === artifactPath) || null;
    return {
      bundle_id: defaultMapping?.bundle_id || '',
      subject_codes: defaultMapping?.subject_codes || [],
      path: artifactPath,
    };
  });
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
  const verificationMappings = buildVerificationMappings(cli);

  const sourceArtifacts = {
    rollout_gate_artifact: {
      path: toRel(rolloutGateArtifactPath),
      exists: true,
    },
    rollout_gate: {
      path: rolloutGateSourcePath ? toRel(rolloutGateSourcePath) : null,
      exists: Boolean(rolloutGateSourcePath) && fs.existsSync(rolloutGateSourcePath),
    },
    verification_artifacts: verificationMappings.map((mapping) => {
      const described = describeArtifact(mapping.path);
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
    verificationArtifacts: verificationMappings.map((mapping) => {
      const resolved = resolveCliPath(mapping.path);
      return {
        bundle_id: mapping.bundle_id,
        subject_codes: mapping.subject_codes,
        path: resolved ? toRel(resolved) : mapping.path,
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
