#!/usr/bin/env node

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  alignmentJoinManifest,
  authorityFreezeManifest,
} from './lib/authority-alignment.js';
import {
  render9709ReleasePreflightMarkdown,
  validate9709ReleasePreflight,
} from './lib/9709-release-preflight.js';
import {
  buildQuestionEvidenceBundlesV1,
  summarizeQuestionEvidenceBundlesV1,
} from './lib/question-evidence-bundle-v1.js';
import { toWindowsWslUncPath } from './run_9709_wave1_search_closure.js';
import {
  buildGateCommand,
  inspectDescriptorSourceFromDatabase,
  loadQuestionSearchGoldFixture,
  resolveQuestionSearchGatePsqlConfig,
  resolveTopicPathFromDatabase,
  runQuestionSearchGate,
  searchProjectionFromDatabase,
} from '../evaluation/run_question_search_gate.js';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS = Object.freeze({
  manifest: 'data/manifests/9709_question_search_recovery_v1.json',
  authoritySidecar: null,
  curriculumSeed: 'data/curriculum/9709_question_search_recovery_nodes_v1.json',
  laneResults: 'docs/reports/2026-04-16-9709-qwen-wave1-live-results-hotfix-rerun-v4.json',
  authorityManifestOut: 'docs/reports/2026-04-22-9709-authority-freeze-manifest.json',
  alignedManifestOut: 'docs/reports/2026-04-22-9709-aligned-manifest.json',
  readyManifestOut: 'docs/reports/2026-04-22-9709-ready-only-manifest.json',
  evidenceBundlesOut: 'docs/reports/2026-04-22-9709-question-evidence-bundles-v1.json',
  fixture: 'data/eval/question_search_gold_9709_v1.json',
  gateReport: 'docs/reports/2026-04-22-9709-ready-only-search-gate-report.md',
  gateJson: 'docs/reports/2026-04-22-9709-ready-only-search-gate.json',
  releasePreflightJson: 'docs/reports/2026-04-24-9709-release-preflight.json',
  releasePreflightMarkdown: 'docs/reports/2026-04-24-9709-release-preflight.md',
  gatePsqlMode: 'docker',
  gatePsqlContainer: null,
});

function writeStdoutLine(message) {
  fs.writeSync(1, `${message}\n`);
}

function writeStderrLine(message) {
  fs.writeSync(2, `${message}\n`);
}

function printUsage() {
  writeStdoutLine(
    'Usage: node scripts/learning/run_9709_authority_ready_batch.js --manifest <path> [--authority-sidecar <path>] [--curriculum-seed <path>] [--lane-results <path>] [--authority-manifest-out <path>] [--aligned-manifest-out <path>] [--ready-manifest-out <path>] [--evidence-bundles-out <path>] [--fixture <path>] [--gate-report <path>] [--gate-json <path>] [--gate-psql-mode <direct|docker>] [--gate-psql-container <name>] [--dry-run] [--artifacts-only]',
  );
}

function normalizeOptionalString(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGatePsqlMode(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!normalized) {
    return DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.gatePsqlMode;
  }
  if (!['direct', 'docker'].includes(normalized)) {
    throw new Error(`Unsupported --gate-psql-mode: ${value}`);
  }
  return normalized;
}

function ensureRequiredValue(argv, index, flag) {
  const value = argv[index + 1] ?? null;
  if (!value || String(value).startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    manifest: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.manifest,
    authoritySidecar: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.authoritySidecar,
    curriculumSeed: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.curriculumSeed,
    laneResults: [DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.laneResults],
    authorityManifestOut: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.authorityManifestOut,
    alignedManifestOut: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.alignedManifestOut,
    readyManifestOut: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.readyManifestOut,
    evidenceBundlesOut: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.evidenceBundlesOut,
    fixture: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.fixture,
    gateReport: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.gateReport,
    gateJson: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.gateJson,
    releasePreflightJson: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.releasePreflightJson,
    releasePreflightMarkdown: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.releasePreflightMarkdown,
    releasePreflightExpectedCount: null,
    skipReleasePreflight: false,
    gatePsqlMode: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.gatePsqlMode,
    gatePsqlContainer: DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.gatePsqlContainer,
    dryRun: false,
    artifactsOnly: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help') {
      options.help = true;
      continue;
    }
    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (token === '--artifacts-only') {
      options.artifactsOnly = true;
      continue;
    }
    if (token === '--manifest') {
      options.manifest = ensureRequiredValue(argv, index, '--manifest');
      index += 1;
      continue;
    }
    if (token === '--authority-sidecar') {
      options.authoritySidecar = ensureRequiredValue(argv, index, '--authority-sidecar');
      index += 1;
      continue;
    }
    if (token === '--curriculum-seed') {
      options.curriculumSeed = ensureRequiredValue(argv, index, '--curriculum-seed');
      index += 1;
      continue;
    }
    if (token === '--lane-results') {
      if (
        options.laneResults.length === 1
        && options.laneResults[0] === DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.laneResults
      ) {
        options.laneResults = [];
      }
      options.laneResults.push(ensureRequiredValue(argv, index, '--lane-results'));
      index += 1;
      continue;
    }
    if (token === '--authority-manifest-out') {
      options.authorityManifestOut = ensureRequiredValue(argv, index, '--authority-manifest-out');
      index += 1;
      continue;
    }
    if (token === '--aligned-manifest-out') {
      options.alignedManifestOut = ensureRequiredValue(argv, index, '--aligned-manifest-out');
      index += 1;
      continue;
    }
    if (token === '--ready-manifest-out') {
      options.readyManifestOut = ensureRequiredValue(argv, index, '--ready-manifest-out');
      index += 1;
      continue;
    }
    if (token === '--evidence-bundles-out') {
      options.evidenceBundlesOut = ensureRequiredValue(argv, index, '--evidence-bundles-out');
      index += 1;
      continue;
    }
    if (token === '--fixture') {
      options.fixture = ensureRequiredValue(argv, index, '--fixture');
      index += 1;
      continue;
    }
    if (token === '--gate-report') {
      options.gateReport = ensureRequiredValue(argv, index, '--gate-report');
      index += 1;
      continue;
    }
    if (token === '--gate-json') {
      options.gateJson = ensureRequiredValue(argv, index, '--gate-json');
      index += 1;
      continue;
    }
    if (token === '--release-preflight-json') {
      options.releasePreflightJson = ensureRequiredValue(argv, index, '--release-preflight-json');
      index += 1;
      continue;
    }
    if (token === '--release-preflight-markdown') {
      options.releasePreflightMarkdown = ensureRequiredValue(argv, index, '--release-preflight-markdown');
      index += 1;
      continue;
    }
    if (token === '--release-preflight-expected-count') {
      const value = Number(ensureRequiredValue(argv, index, '--release-preflight-expected-count'));
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('--release-preflight-expected-count must be a non-negative integer.');
      }
      options.releasePreflightExpectedCount = value;
      index += 1;
      continue;
    }
    if (token === '--skip-release-preflight') {
      options.skipReleasePreflight = true;
      continue;
    }
    if (token === '--gate-psql-mode') {
      options.gatePsqlMode = normalizeGatePsqlMode(ensureRequiredValue(argv, index, '--gate-psql-mode'));
      index += 1;
      continue;
    }
    if (token === '--gate-psql-container') {
      options.gatePsqlContainer = normalizeOptionalString(
        ensureRequiredValue(argv, index, '--gate-psql-container'),
      );
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (!options.laneResults.length) {
    throw new Error('At least one --lane-results file is required.');
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function normalizeAuthoritySidecarPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Authority sidecar file must contain an object payload.');
  }

  if (Array.isArray(payload.items)) {
    return payload.items.reduce((accumulator, item) => {
      const storageKey = normalizeString(item?.storage_key);
      if (!storageKey) {
        throw new Error('Authority sidecar items require storage_key.');
      }
      accumulator[storageKey] = item.authority_input_pack ?? item;
      return accumulator;
    }, {});
  }

  return payload;
}

function normalizeLaneOutputPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.results)) {
    return payload.results;
  }
  if (Array.isArray(payload?.outputs)) {
    return payload.outputs;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  throw new Error('Lane results file must contain an array of outputs or a { results } payload.');
}

function loadLaneOutputs(paths = []) {
  return paths.flatMap((filePath) => normalizeLaneOutputPayload(readJson(filePath)));
}

function laneEvidenceMap(laneOutput = {}) {
  const entries = Array.isArray(laneOutput?.output?.evidence)
    ? laneOutput.output.evidence
    : [];

  return entries.reduce((accumulator, entry) => {
    const field = normalizeString(entry?.field);
    if (!field) {
      return accumulator;
    }
    accumulator[field] = entry?.value ?? null;
    return accumulator;
  }, {});
}

function loadVisualTopicGuesses(laneOutputs = []) {
  return laneOutputs.reduce((accumulator, laneOutput) => {
    const storageKey = normalizeString(laneOutput?.input_asset_id);
    if (!storageKey) {
      return accumulator;
    }

    const evidence = laneEvidenceMap(laneOutput);
    const visualTopicGuess = normalizeOptionalString(
      evidence.visual_topic_guess ?? laneOutput?.output?.visual_topic_guess,
    );
    if (visualTopicGuess) {
      accumulator[storageKey] = visualTopicGuess;
    }
    return accumulator;
  }, {});
}

function loadVisualDispositions(laneOutputs = []) {
  return laneOutputs.reduce((accumulator, laneOutput) => {
    const storageKey = normalizeString(laneOutput?.input_asset_id);
    if (!storageKey) {
      return accumulator;
    }

    const evidence = laneEvidenceMap(laneOutput);
    const patch = evidence.visual_disposition_patch ?? {};
    const visualTopicGuessStatus = normalizeOptionalString(
      patch.visual_topic_guess_status
      ?? evidence.visual_topic_guess_status
      ?? laneOutput?.output?.visual_topic_guess_status,
    );
    const replacementVisualTopicGuess = normalizeOptionalString(
      patch.replacement_visual_topic_guess
      ?? evidence.replacement_visual_topic_guess
      ?? laneOutput?.output?.replacement_visual_topic_guess,
    );

    if (visualTopicGuessStatus || replacementVisualTopicGuess) {
      accumulator[storageKey] = {
        visual_topic_guess_status: visualTopicGuessStatus,
        replacement_visual_topic_guess: replacementVisualTopicGuess,
      };
    }

    return accumulator;
  }, {});
}

function normalizeSeedNode(node = {}, defaults = {}) {
  return {
    syllabus_code: normalizeString(node.syllabus_code) || defaults.syllabusCode,
    version_tag: normalizeString(node.version_tag) || defaults.versionTag,
    topic_path: normalizeString(node.topic_path),
  };
}

function buildSeedIdentity({ syllabusCode, topicPath, versionTag }) {
  return `${normalizeString(syllabusCode)}::${normalizeString(topicPath)}::${normalizeString(versionTag)}`;
}

function deriveParentTopicPath(topicPath) {
  const normalized = normalizeString(topicPath);
  if (!normalized.includes('.')) {
    return null;
  }
  return normalized.split('.').slice(0, -1).join('.');
}

export function buildCurriculumSeedResolver(curriculumSeed = {}) {
  const defaultSyllabusCode = normalizeString(curriculumSeed.syllabus_code);
  const defaultVersionTag = normalizeString(curriculumSeed.version_tag);
  const nodes = Array.isArray(curriculumSeed.nodes) ? curriculumSeed.nodes : [];
  const exactNodes = new Set();
  const availableVersions = new Set();

  for (const node of nodes.map((entry) => normalizeSeedNode(entry, {
    syllabusCode: defaultSyllabusCode,
    versionTag: defaultVersionTag,
  }))) {
    if (!node.syllabus_code || !node.version_tag || !node.topic_path) {
      continue;
    }
    exactNodes.add(buildSeedIdentity({
      syllabusCode: node.syllabus_code,
      topicPath: node.topic_path,
      versionTag: node.version_tag,
    }));
    availableVersions.add(`${node.syllabus_code}::${node.version_tag}`);
  }

  return async function resolveCurriculumNodeStatus({
    syllabusCode,
    topicPath,
    curriculumVersionTag,
  } = {}) {
    const normalizedSyllabusCode = normalizeString(syllabusCode);
    const normalizedTopicPath = normalizeString(topicPath);
    const normalizedVersionTag = normalizeString(curriculumVersionTag) || defaultVersionTag;
    const identity = buildSeedIdentity({
      syllabusCode: normalizedSyllabusCode,
      topicPath: normalizedTopicPath,
      versionTag: normalizedVersionTag,
    });

    if (exactNodes.has(identity)) {
      return {
        status: 'resolved',
        node: { node_id: identity },
        reason_code: null,
      };
    }

    if (!availableVersions.has(`${normalizedSyllabusCode}::${normalizedVersionTag}`)) {
      return {
        status: 'blocked',
        node: null,
        reason_code: 'missing_curriculum_version',
      };
    }

    if (!normalizedTopicPath.startsWith(`${normalizedSyllabusCode}.`)) {
      return {
        status: 'blocked',
        node: null,
        reason_code: 'invalid_topic_path',
      };
    }

    let ancestorPath = deriveParentTopicPath(normalizedTopicPath);
    while (ancestorPath) {
      if (exactNodes.has(buildSeedIdentity({
        syllabusCode: normalizedSyllabusCode,
        topicPath: ancestorPath,
        versionTag: normalizedVersionTag,
      }))) {
        return {
          status: 'needs_seed',
          node: null,
          reason_code: 'missing_seed',
        };
      }
      ancestorPath = deriveParentTopicPath(ancestorPath);
    }

    return {
      status: 'blocked',
      node: null,
      reason_code: 'invalid_topic_path',
    };
  };
}

function buildReadyBatchSummary(alignedManifest = {}, bundles = []) {
  const items = Array.isArray(alignedManifest.items) ? alignedManifest.items : [];
  const verdictCounts = items.reduce((accumulator, item) => {
    const verdict = normalizeOptionalString(item?.overall_alignment_verdict) ?? 'unknown';
    accumulator[verdict] = (accumulator[verdict] ?? 0) + 1;
    return accumulator;
  }, {});
  const readyItems = items.filter((item) => item?.overall_alignment_verdict === 'ready');

  return {
    total_items: items.length,
    ready_items: readyItems.length,
    blocked_items: items.length - readyItems.length,
    verdict_counts: verdictCounts,
    bundle_summary: summarizeQuestionEvidenceBundlesV1(bundles),
  };
}

export async function buildAuthorityReadyBatchArtifacts({
  manifest,
  authoritySidecar = {},
  curriculumSeed = {},
  laneOutputs = [],
  normalizeVisualTopicGuess,
} = {}) {
  const authorityManifest = await authorityFreezeManifest({
    manifest,
    authoritySidecarByStorageKey: authoritySidecar,
    resolveCurriculumNodeStatus: buildCurriculumSeedResolver(curriculumSeed),
  });

  const alignedManifest = await alignmentJoinManifest({
    manifest: authorityManifest,
    visualTopicGuessByStorageKey: loadVisualTopicGuesses(laneOutputs),
    visualDispositionByStorageKey: loadVisualDispositions(laneOutputs),
    normalizeVisualTopicGuess,
  });

  const readyManifest = {
    ...alignedManifest,
    items: (alignedManifest.items ?? []).filter((item) => item?.overall_alignment_verdict === 'ready'),
  };

  const bundles = buildQuestionEvidenceBundlesV1({
    manifest: alignedManifest,
    laneOutputs,
  });

  return {
    authorityManifest,
    alignedManifest,
    readyManifest,
    bundles,
    summary: buildReadyBatchSummary(alignedManifest, bundles),
  };
}

export function build9709AuthorityReadyBatchPlan({
  readyManifestOut = DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.readyManifestOut,
  curriculumSeed = DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.curriculumSeed,
  evidenceBundlesOut = DEFAULT_9709_AUTHORITY_READY_BATCH_PATHS.evidenceBundlesOut,
} = {}) {
  return [
    {
      label: 'backfill_paper_question_registry',
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        toWindowsWslUncPath(path.join(PROJECT_ROOT, 'scripts', 'learning', 'run_paper_question_registry_backfill_host.ps1')),
        '-Manifest',
        readyManifestOut,
        '-CurriculumSeed',
        curriculumSeed,
      ],
    },
    {
      label: 'hydrate_question_analysis',
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        toWindowsWslUncPath(path.join(PROJECT_ROOT, 'scripts', 'learning', 'run_question_analysis_backfill_host.ps1')),
        '-Manifest',
        readyManifestOut,
        '-EvidenceBundles',
        evidenceBundlesOut,
      ],
    },
  ];
}

function renderStep(step) {
  return [step.command, ...(step.args ?? [])].join(' ');
}

async function runStep(step) {
  writeStdoutLine(`== ${step.label} ==`);
  const { stdout, stderr } = await execFileAsync(step.command, step.args ?? [], {
    cwd: PROJECT_ROOT,
    maxBuffer: 1024 * 1024 * 8,
    env: {
      ...process.env,
      ...(step.env ?? {}),
    },
  });

  if (stdout.trim()) {
    writeStdoutLine(stdout.trimEnd());
  }
  if (stderr.trim()) {
    writeStderrLine(stderr.trimEnd());
  }
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

function writeJson(filePath, payload) {
  ensureParentDir(filePath);
  fs.writeFileSync(path.resolve(filePath), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function writeText(filePath, text) {
  ensureParentDir(filePath);
  fs.writeFileSync(path.resolve(filePath), text, 'utf8');
}

export function build9709ReleasePreflightForArtifacts({
  manifest,
  authoritySidecarPayload,
  curriculumSeed,
  artifacts,
  expectedManifestCount = null,
} = {}) {
  return validate9709ReleasePreflight({
    manifest,
    authoritySidecar: authoritySidecarPayload,
    curriculumSeed,
    evidenceBundles: artifacts?.bundles ?? null,
    readyManifest: artifacts?.readyManifest ?? null,
    expectedManifestCount: expectedManifestCount ?? (Array.isArray(manifest?.items) ? manifest.items.length : 300),
  });
}

export function assert9709ReleasePreflightPassed(preflight) {
  if (preflight?.status !== 'pass') {
    const blockerSummary = (preflight?.blockers ?? [])
      .slice(0, 5)
      .map((finding) => `${finding.reason_code}:${finding.storage_key ?? 'batch'}`)
      .join(', ');
    throw new Error(`9709 release preflight failed with ${(preflight?.blockers ?? []).length} blocker(s): ${blockerSummary}`);
  }
}

function buildAlignmentPostureResolver(alignedManifest = {}) {
  const items = Array.isArray(alignedManifest.items) ? alignedManifest.items : [];
  const itemsByStorageKey = items.reduce((accumulator, item) => {
    const storageKey = normalizeString(item?.storage_key);
    if (!storageKey) {
      return accumulator;
    }
    if (!accumulator.has(storageKey)) {
      accumulator.set(storageKey, []);
    }
    accumulator.get(storageKey).push(item);
    return accumulator;
  }, new Map());

  return async function resolveAlignmentPosture({
    storageKey,
    authorityAlignmentRunId = null,
    sourceManifestDigest = null,
  } = {}) {
    const candidates = itemsByStorageKey.get(normalizeString(storageKey)) ?? [];
    if (candidates.length === 0) {
      return null;
    }

    const exactMatch = candidates.find((item) => (
      (!authorityAlignmentRunId || item.authority_alignment_run_id === authorityAlignmentRunId)
      && (!sourceManifestDigest || item.source_manifest_digest === sourceManifestDigest)
    ));

    return exactMatch ?? candidates[0] ?? null;
  };
}

async function runGateForAlignedManifest({
  fixturePath,
  gateReportPath,
  gateJsonPath,
  gatePsqlMode,
  gatePsqlContainer,
  alignedManifest,
} = {}) {
  const resolvedFixturePath = path.resolve(fixturePath);
  const resolvedGateReportPath = path.resolve(gateReportPath);
  const resolvedGateJsonPath = path.resolve(gateJsonPath);
  const gateArgs = {
    fixture: path.relative(PROJECT_ROOT, resolvedFixturePath),
    report: path.relative(PROJECT_ROOT, resolvedGateReportPath),
    jsonOut: path.relative(PROJECT_ROOT, resolvedGateJsonPath),
    psqlMode: normalizeGatePsqlMode(gatePsqlMode),
    psqlContainer: normalizeOptionalString(gatePsqlContainer),
  };
  const psqlConfig = resolveQuestionSearchGatePsqlConfig(gateArgs);
  const fixture = loadQuestionSearchGoldFixture(resolvedFixturePath);
  const result = await runQuestionSearchGate({
    fixture,
    fixturePath: path.relative(PROJECT_ROOT, resolvedFixturePath),
    gateCommand: buildGateCommand(gateArgs),
    searchQuestionsFn: (searchInput) => searchProjectionFromDatabase(searchInput, { psqlConfig }),
    resolveTopicPathFn: (topicInput) => resolveTopicPathFromDatabase(topicInput, psqlConfig),
    inspectDescriptorSourceFn: () => inspectDescriptorSourceFromDatabase(fixture.subject_code, psqlConfig),
    resolveAlignmentPostureFn: buildAlignmentPostureResolver(alignedManifest),
  });

  ensureParentDir(resolvedGateReportPath);
  fs.writeFileSync(resolvedGateReportPath, result.report_markdown, 'utf8');
  writeJson(resolvedGateJsonPath, {
    fixture_path: path.relative(PROJECT_ROOT, resolvedFixturePath),
    metrics: result.metrics,
    gate: result.gate,
    environment: result.environment,
    case_results: result.case_results,
  });

  return result;
}

export async function main(argv = process.argv.slice(2), {
  normalizeVisualTopicGuess,
} = {}) {
  const options = parseArgs(argv);

  if (options.help) {
    printUsage();
    return null;
  }

  const manifest = readJson(options.manifest);
  const authoritySidecarPayload = options.authoritySidecar ? readJson(options.authoritySidecar) : {};
  const authoritySidecar = options.authoritySidecar
    ? normalizeAuthoritySidecarPayload(authoritySidecarPayload)
    : {};
  const curriculumSeed = readJson(options.curriculumSeed);
  const laneResultPaths = options.laneResults.filter(Boolean);
  const laneOutputs = loadLaneOutputs(laneResultPaths);
  const artifacts = await buildAuthorityReadyBatchArtifacts({
    manifest,
    authoritySidecar,
    curriculumSeed,
    laneOutputs,
    normalizeVisualTopicGuess,
  });
  const plan = build9709AuthorityReadyBatchPlan({
    readyManifestOut: options.readyManifestOut,
    curriculumSeed: options.curriculumSeed,
    evidenceBundlesOut: options.evidenceBundlesOut,
  });

  writeStdoutLine(`manifest_id: ${manifest.manifest_id ?? 'unknown'}`);
  writeStdoutLine(`total_items: ${artifacts.summary.total_items}`);
  writeStdoutLine(`ready_items: ${artifacts.summary.ready_items}`);
  writeStdoutLine(`blocked_items: ${artifacts.summary.blocked_items}`);
  const releasePreflight = options.skipReleasePreflight
    ? null
    : build9709ReleasePreflightForArtifacts({
      manifest,
      authoritySidecarPayload,
      curriculumSeed,
      artifacts,
      expectedManifestCount: options.releasePreflightExpectedCount,
    });

  if (releasePreflight) {
    writeStdoutLine(`release_preflight_status: ${releasePreflight.status}`);
    writeStdoutLine(`release_preflight_blockers: ${releasePreflight.blockers.length}`);
    writeStdoutLine(`release_preflight_warnings: ${releasePreflight.warnings.length}`);
  }

  if (options.dryRun) {
    writeStdoutLine(`authority_manifest_out: ${options.authorityManifestOut}`);
    writeStdoutLine(`aligned_manifest_out: ${options.alignedManifestOut}`);
    writeStdoutLine(`ready_manifest_out: ${options.readyManifestOut}`);
    writeStdoutLine(`evidence_bundles_out: ${options.evidenceBundlesOut}`);
    writeStdoutLine(`release_preflight_json: ${options.releasePreflightJson}`);
    writeStdoutLine(`release_preflight_markdown: ${options.releasePreflightMarkdown}`);
    writeStdoutLine(`gate_report: ${options.gateReport}`);
    writeStdoutLine(`gate_json: ${options.gateJson}`);
    for (const step of plan) {
      writeStdoutLine(`${step.label}: ${renderStep(step)}`);
    }
    return {
      ...artifacts,
      releasePreflight,
      plan,
    };
  }

  if (releasePreflight) {
    writeJson(options.releasePreflightJson, releasePreflight);
    writeText(options.releasePreflightMarkdown, render9709ReleasePreflightMarkdown(releasePreflight));
    assert9709ReleasePreflightPassed(releasePreflight);
  }

  writeJson(options.authorityManifestOut, artifacts.authorityManifest);
  writeJson(options.alignedManifestOut, artifacts.alignedManifest);
  writeJson(options.readyManifestOut, artifacts.readyManifest);
  writeJson(options.evidenceBundlesOut, {
    manifest_id: artifacts.alignedManifest.manifest_id ?? null,
    bundles: artifacts.bundles,
    summary: artifacts.summary.bundle_summary,
  });

  if (options.artifactsOnly) {
    writeStdoutLine('artifacts_only: true');
    writeStdoutLine('skipping registry, analysis, search gate, and downstream write steps');
    return {
      ...artifacts,
      releasePreflight,
      plan,
    };
  }

  if (artifacts.readyManifest.items.length > 0) {
    for (const step of plan) {
      await runStep(step);
    }
  } else {
    writeStdoutLine('ready_items=0; skipping registry and AO analysis host steps');
  }

  const gateResult = await runGateForAlignedManifest({
    fixturePath: options.fixture,
    gateReportPath: options.gateReport,
    gateJsonPath: options.gateJson,
    gatePsqlMode: options.gatePsqlMode,
    gatePsqlContainer: options.gatePsqlContainer,
    alignedManifest: artifacts.alignedManifest,
  });

  writeStdoutLine(`gate_pass: ${gateResult.gate.pass}`);
  return {
    ...artifacts,
    plan,
    gate: gateResult.gate,
  };
}

export function is9709AuthorityReadyBatchEntrypoint(entryScriptPath, metaUrl = import.meta.url) {
  if (!entryScriptPath) {
    return false;
  }

  return path.resolve(entryScriptPath) === fileURLToPath(metaUrl);
}

if (is9709AuthorityReadyBatchEntrypoint(process.argv[1], import.meta.url)) {
  try {
    await main();
  } catch (error) {
    writeStderrLine(error?.stack || String(error));
    process.exitCode = 1;
  }
}
