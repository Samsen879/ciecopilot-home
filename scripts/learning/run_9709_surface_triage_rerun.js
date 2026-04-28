import fs from 'node:fs';
import {
  applySurfaceTriageToManifest,
  compareQuestionEvidenceBundles,
} from './lib/9709-surface-triage-rerun.js';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    manifest: null,
    surfaceTriage: null,
    outputManifest: null,
    baselineBundles: null,
    candidateBundles: null,
    diffOutput: null,
    preserveDiagramPresent: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--manifest') {
      options.manifest = argv[index + 1];
      index += 1;
    } else if (token === '--surface-triage') {
      options.surfaceTriage = argv[index + 1];
      index += 1;
    } else if (token === '--output-manifest') {
      options.outputManifest = argv[index + 1];
      index += 1;
    } else if (token === '--baseline-bundles') {
      options.baselineBundles = argv[index + 1];
      index += 1;
    } else if (token === '--candidate-bundles') {
      options.candidateBundles = argv[index + 1];
      index += 1;
    } else if (token === '--diff-output') {
      options.diffOutput = argv[index + 1];
      index += 1;
    } else if (token === '--allow-qwen-diagram-overwrite') {
      options.preserveDiagramPresent = false;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  if (!options.manifest || !options.surfaceTriage || !options.outputManifest) {
    throw new Error('Usage: node scripts/learning/run_9709_surface_triage_rerun.js --manifest <path> --surface-triage <path> --output-manifest <path> [--baseline-bundles <path> --candidate-bundles <path> --diff-output <path>]');
  }

  return options;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const { manifest, summary } = applySurfaceTriageToManifest({
    manifest: readJson(options.manifest),
    triageResults: readJson(options.surfaceTriage),
    preserveDiagramPresent: options.preserveDiagramPresent,
  });
  writeJson(options.outputManifest, manifest);
  fs.writeSync(1, `wrote_triaged_manifest: ${options.outputManifest}\n`);
  fs.writeSync(1, `surface_triage_summary: ${JSON.stringify(summary)}\n`);

  if (options.baselineBundles || options.candidateBundles || options.diffOutput) {
    if (!options.baselineBundles || !options.candidateBundles || !options.diffOutput) {
      throw new Error('Bundle diff requires --baseline-bundles, --candidate-bundles, and --diff-output.');
    }
    const diff = compareQuestionEvidenceBundles({
      baseline: readJson(options.baselineBundles),
      candidate: readJson(options.candidateBundles),
    });
    writeJson(options.diffOutput, diff);
    fs.writeSync(1, `wrote_bundle_diff: ${options.diffOutput}\n`);
    fs.writeSync(1, `bundle_diff_summary: ${JSON.stringify(diff.summary)}\n`);
  }

  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('run_9709_surface_triage_rerun.js')) {
  try {
    const exitCode = await main();
    process.exitCode = exitCode;
  } catch (error) {
    fs.writeSync(2, `${error.message}\n`);
    process.exitCode = 1;
  }
}
