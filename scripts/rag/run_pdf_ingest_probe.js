#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LATEST_INGEST = path.join(ROOT, 'runs', 'backend', 'rag_ingest_latest_summary.json');
const DRY_PAST_OUT = path.join(ROOT, 'runs', 'backend', 'rag_pdf_ingest_probe_dry_past.json');
const DRY_MARK_OUT = path.join(ROOT, 'runs', 'backend', 'rag_pdf_ingest_probe_dry_mark.json');
const LIVE_PAST_OUT = path.join(ROOT, 'runs', 'backend', 'rag_pdf_ingest_probe_live_past.json');
const LIVE_MARK_OUT = path.join(ROOT, 'runs', 'backend', 'rag_pdf_ingest_probe_live_mark.json');
const SUMMARY_OUT = path.join(ROOT, 'runs', 'backend', 'rag_pdf_ingest_probe_summary.json');

function parseCliArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('-')) continue;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      out[token.slice(token.startsWith('--') ? 2 : 1, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(token.startsWith('--') ? 2 : 1);
    const next = args[i + 1];
    if (next && !next.startsWith('-')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function runCommand(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  });
  return {
    exit_code: result.status ?? 1,
    signal: result.signal ?? null,
  };
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function buildPdfMetrics(summary) {
  const sources = Array.isArray(summary?.sources) ? summary.sources : [];
  const pdfSources = sources
    .filter((item) => {
      const sourceKind = String(item.source_kind || '');
      return sourceKind.endsWith('_pdf') || sourceKind === 'pdf';
    })
    .map((item) => {
      const sourcePath = String(item.source_path || '').toLowerCase();
      let derivedSourceType = String(item.source_kind || '');
      if (derivedSourceType === 'pdf') {
        if (sourcePath.includes('mark-schemes')) derivedSourceType = 'mark_scheme_pdf';
        else if (sourcePath.includes('past-papers')) derivedSourceType = 'past_paper_pdf';
        else derivedSourceType = 'pdf_unknown';
      }
      return {
        ...item,
        _derived_source_type: derivedSourceType,
      };
    });
  const total = pdfSources.length;
  const parseFailurePattern = /(no_content_chunks|enoent|invalid pdf|password|unable to parse|pdf parse|parse failed)/i;
  const parseFailures = pdfSources.filter((item) => {
    const reason = String(item.reason || '');
    if (item.reason === 'no_content_chunks') return true;
    return item.status === 'failed' && parseFailurePattern.test(reason);
  });
  const parsedSuccess = Math.max(total - parseFailures.length, 0);
  const failed = pdfSources.filter((item) => item.status === 'failed').length;
  const parseSuccessRate = total > 0 ? parsedSuccess / total : 0;
  const sourceTypeCounts = pdfSources.reduce((acc, item) => {
    const key = String(item._derived_source_type || item.source_kind || 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const failedReasons = pdfSources
    .filter((item) => item.status === 'failed')
    .reduce((acc, item) => {
      const key = String(item.reason || 'unknown');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

  return {
    total_pdf_sources: total,
    parsed_success_count: parsedSuccess,
    parse_failure_count: parseFailures.length,
    failed_count: failed,
    parse_success_rate: Number(parseSuccessRate.toFixed(6)),
    source_type_counts: sourceTypeCounts,
    failed_reason_counts: failedReasons,
  };
}

function mergeSourceTypeCounts(...countsList) {
  const out = {};
  for (const counts of countsList) {
    for (const [key, value] of Object.entries(counts || {})) {
      out[key] = (out[key] || 0) + Number(value || 0);
    }
  }
  return out;
}

function main() {
  const argv = parseCliArgs(process.argv.slice(2));
  const subject = String(argv.subject || '9702');
  const limit = Number.isFinite(Number(argv.limit)) ? Number(argv.limit) : 2;
  const corpusVersionPrefix = String(argv['corpus-version-prefix'] || 'rag_s1_3_pdf_probe');

  function runPhase({ label, dryRun, pdfKind, outFile, corpusSuffix }) {
    const args = [
      'scripts/rag_ingest.js',
      '--subject',
      subject,
      '--pdf',
      '--pdf-kind',
      pdfKind,
      '--limit',
      String(limit),
      '--continue-on-error',
      '--skip-existing',
      '--write-mode',
      'canonical',
      '--corpus-version',
      `${corpusVersionPrefix}_${corpusSuffix}`,
    ];
    if (dryRun) args.push('--dry');

    const run = runCommand(args);
    const copied = copyIfExists(LATEST_INGEST, outFile);
    const summary = copied ? readJson(outFile) : null;
    const metrics = buildPdfMetrics(summary);
    return {
      label,
      pdf_kind: pdfKind,
      dry_run: dryRun,
      command: [process.execPath, ...args],
      ...run,
      artifact: path.relative(ROOT, outFile).replace(/\\/g, '/'),
      metrics,
    };
  }

  const dryPast = runPhase({
    label: 'dry_past',
    dryRun: true,
    pdfKind: 'past',
    outFile: DRY_PAST_OUT,
    corpusSuffix: 'dry_past',
  });
  const dryMark = runPhase({
    label: 'dry_mark',
    dryRun: true,
    pdfKind: 'mark',
    outFile: DRY_MARK_OUT,
    corpusSuffix: 'dry_mark',
  });
  const livePast = runPhase({
    label: 'live_past',
    dryRun: false,
    pdfKind: 'past',
    outFile: LIVE_PAST_OUT,
    corpusSuffix: 'live_past',
  });
  const liveMark = runPhase({
    label: 'live_mark',
    dryRun: false,
    pdfKind: 'mark',
    outFile: LIVE_MARK_OUT,
    corpusSuffix: 'live_mark',
  });

  const mergedTotal =
    dryPast.metrics.total_pdf_sources +
    dryMark.metrics.total_pdf_sources +
    livePast.metrics.total_pdf_sources +
    liveMark.metrics.total_pdf_sources;
  const mergedParsed =
    dryPast.metrics.parsed_success_count +
    dryMark.metrics.parsed_success_count +
    livePast.metrics.parsed_success_count +
    liveMark.metrics.parsed_success_count;
  const mergedRate = mergedTotal > 0 ? mergedParsed / mergedTotal : 0;

  const summary = {
    generated_at: new Date().toISOString(),
    config: {
      subject,
      limit,
      corpus_version_prefix: corpusVersionPrefix,
      threshold_parse_success_rate_min: 0.9,
    },
    phases: [dryPast, dryMark, livePast, liveMark],
    aggregate: {
      total_pdf_sources: mergedTotal,
      parsed_success_count: mergedParsed,
      parse_success_rate: Number(mergedRate.toFixed(6)),
      source_type_counts: mergeSourceTypeCounts(
        dryPast.metrics.source_type_counts,
        dryMark.metrics.source_type_counts,
        livePast.metrics.source_type_counts,
        liveMark.metrics.source_type_counts,
      ),
    },
    threshold_checks: {
      dry_path_executable: dryPast.exit_code === 0 && dryMark.exit_code === 0,
      live_path_executable: livePast.exit_code === 0 && liveMark.exit_code === 0,
      parse_success_rate_gte_0_90: Number(mergedRate.toFixed(6)) >= 0.9,
      has_past_paper_pdf: false,
      has_mark_scheme_pdf: false,
    },
  };

  // Re-evaluate checks that depend on aggregate payload.
  summary.threshold_checks.has_past_paper_pdf = Number(summary.aggregate.source_type_counts.past_paper_pdf || 0) > 0;
  summary.threshold_checks.has_mark_scheme_pdf = Number(summary.aggregate.source_type_counts.mark_scheme_pdf || 0) > 0;

  summary.status = Object.values(summary.threshold_checks).every(Boolean) ? 'pass' : 'warn';

  fs.mkdirSync(path.dirname(SUMMARY_OUT), { recursive: true });
  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  process.stdout.write(`${SUMMARY_OUT}\n`);
}

main();
