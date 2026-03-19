#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { executeProductionEvidencePromotionBridge } from './lib/production-evidence-promotion-bridge.js';
import { resolveCliPathFromRoot } from './lib/cli-paths.js';

const __filename = fileURLToPath(import.meta.url);

function getRoot() {
  return process.cwd();
}

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

function resolveCliPath(inputPath) {
  return resolveCliPathFromRoot(getRoot(), inputPath);
}

function toRel(filePath) {
  return path.relative(getRoot(), filePath).replace(/\\/g, '/');
}

function toList(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === false) return [];
  return [value];
}

export function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  const candidateDir = cli['candidate-dir'];
  const candidateManifestPath = cli.manifest;
  const candidateItemsPath = cli['items-json'];
  const targetBundleId = typeof cli['target-bundle-id'] === 'string' ? cli['target-bundle-id'].trim() : '';
  const approvedCorpusVersions = toList(cli['approved-corpus-version']).map((item) => String(item).trim()).filter(Boolean);
  const proposalOnly = cli['proposal-only'] === true;
  const dryRun = cli['dry-run'] === true;

  if (proposalOnly && dryRun) {
    throw new Error('dry-run and proposal-only are mutually exclusive');
  }
  if (!candidateDir && !candidateManifestPath) {
    throw new Error('candidate dir or explicit manifest/items paths are required');
  }
  if (candidateDir && (candidateManifestPath || candidateItemsPath)) {
    throw new Error('candidate input must use either --candidate-dir or explicit --manifest/--items-json paths');
  }
  if (!candidateDir && (!candidateManifestPath || !candidateItemsPath)) {
    throw new Error('explicit manifest and items-json paths are required');
  }
  if (!targetBundleId) {
    throw new Error('target bundle id is required');
  }

  const result = executeProductionEvidencePromotionBridge({
    rootDir: getRoot(),
    mode: proposalOnly ? 'proposal-only' : dryRun ? 'dry-run' : 'apply',
    candidateDir: candidateDir ? toRel(resolveCliPath(candidateDir)) : null,
    candidateManifestPath: candidateManifestPath ? toRel(resolveCliPath(candidateManifestPath)) : null,
    candidateItemsPath: candidateItemsPath ? toRel(resolveCliPath(candidateItemsPath)) : null,
    targetBundleId,
    approvedCorpusVersions,
    proposalDir: typeof cli['proposal-dir'] === 'string' ? toRel(resolveCliPath(cli['proposal-dir'])) : null,
    whitelistPath: typeof cli.whitelist === 'string' ? toRel(resolveCliPath(cli.whitelist)) : 'data/evidence/production/whitelist_v1.json',
    rolloutGatePath:
      typeof cli['rollout-gate'] === 'string'
        ? toRel(resolveCliPath(cli['rollout-gate']))
        : 'data/evidence/production/rollout_gate_v1.json',
    receiptJsonPath:
      typeof cli['receipt-json'] === 'string' ? toRel(resolveCliPath(cli['receipt-json'])) : null,
    receiptMdPath: typeof cli['receipt-md'] === 'string' ? toRel(resolveCliPath(cli['receipt-md'])) : null,
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        mode: result.mode,
        replayed: result.replayed,
        writes: result.writes,
        validation: {
          manifest_valid: result.validation.manifest_valid,
          whitelist_valid: result.validation.whitelist_valid,
          release_ready: result.validation.release_ready,
          ingest_permitted: result.validation.ingest_permitted,
        },
        paths: result.paths || result.proposalPaths || null,
      },
      null,
      2,
    )}\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
