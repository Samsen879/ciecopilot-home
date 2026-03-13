#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const EVAL_SCRIPT = path.join(ROOT, 'scripts', 'rag', 'run_s2_augmentation_eval.js');
const PROFILE_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_readiness_profile.json');
const SUMMARY_FILE = path.join(ROOT, 'runs', 'backend', 'rag_s2_augmentation_eval_summary.json');
const REPORT_FILE = path.join(ROOT, 'docs', 'reports', 'rag_s2_augmentation_eval_report.md');
const OUT_JSON = path.join(ROOT, 'runs', 'backend', 'rag_s2_route_share_ramp_experiment.json');
const OUT_MD = path.join(ROOT, 'docs', 'reports', 'rag_s2_route_share_ramp_experiment.md');

const DEFAULT_LIMIT = 90;
const DEFAULT_ROUTE_SHARE_MIN = 0.3;
const DEFAULT_ROUTE_SHARE_MAX = 0.5;
const DEFAULT_FALLBACK_RATE_MAX = 0.2;

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function parseVariantFilter(value) {
  if (!value) return null;
  const items = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? new Set(items) : null;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNonNegativeInt(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function truncateText(value, max = 1200) {
  const text = String(value || '');
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...(truncated)`;
}

function ensureReadinessProfile() {
  if (fs.existsSync(PROFILE_FILE)) return;
  const script = path.join(ROOT, 'scripts', 'rag', 'build_s2_readiness_profile.js');
  const run = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  if (run.status !== 0) {
    throw new Error(`failed to build readiness profile: ${run.stderr || run.stdout}`);
  }
}

function deriveDepthVariants(profile) {
  const recommendedMap =
    profile && typeof profile.recommended_max_topic_depth_by_subject === 'object'
      ? profile.recommended_max_topic_depth_by_subject
      : {};
  const aggressiveMap = Object.fromEntries(
    Object.entries(profile?.subject_profiles || {})
      .map(([subjectCode, subjectProfile]) => [
        subjectCode,
        toNumber(subjectProfile?.max_topic_depth_candidates?.aggressive, 0),
      ])
      .filter(([, depth]) => depth > 0),
  );
  const balancedPlusMap = {
    ...recommendedMap,
    ...(recommendedMap?.['9231'] ? { '9231': Math.max(3, toNumber(recommendedMap['9231'], 1)) } : {}),
  };
  return [
    {
      id: 'conservative_depth_1',
      description: 'Global depth=1, no subject overrides',
      readiness_max_topic_depth: 1,
      readiness_max_topic_depth_by_subject: {},
    },
    {
      id: 'balanced_profile',
      description: 'Use readiness profile recommended depth by subject',
      readiness_max_topic_depth: 1,
      readiness_max_topic_depth_by_subject: recommendedMap,
    },
    {
      id: 'balanced_plus_9231',
      description: 'Balanced profile with deeper 9231 allowance',
      readiness_max_topic_depth: 1,
      readiness_max_topic_depth_by_subject: balancedPlusMap,
    },
    {
      id: 'aggressive_profile',
      description: 'Use aggressive depth candidates from readiness profile',
      readiness_max_topic_depth: 2,
      readiness_max_topic_depth_by_subject: aggressiveMap,
    },
  ];
}

function pickRecommendation(results, { routeShareMin, routeShareMax, fallbackRateMax }) {
  const center = (routeShareMin + routeShareMax) / 2;
  const eligible = results.filter(
    (item) =>
      item.eval_success &&
      item.summary_valid &&
      item.fallback_rate !== null &&
      item.quality_delta !== null &&
      item.fallback_rate <= fallbackRateMax &&
      item.quality_delta > 0,
  );
  const inBand = eligible.filter((item) => item.route_share >= routeShareMin && item.route_share <= routeShareMax);
  if (inBand.length > 0) {
    return inBand.sort((a, b) => b.quality_delta - a.quality_delta || a.fallback_rate - b.fallback_rate)[0];
  }
  if (eligible.length > 0) {
    return eligible.sort(
      (a, b) =>
        Math.abs(a.route_share - center) - Math.abs(b.route_share - center) ||
        b.quality_delta - a.quality_delta,
    )[0];
  }
  return null;
}

function copyArtifactIfExists(sourceFile, targetFile) {
  if (!fs.existsSync(sourceFile)) return;
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.copyFileSync(sourceFile, targetFile);
}

function renderReport(payload) {
  const lines = [
    '# RAG S2 Route Share Ramp Experiment',
    '',
    `- Generated at: \`${payload.generated_at}\``,
    `- Dataset limit: \`${payload.run_config.limit}\``,
    `- Target route share band: \`${payload.thresholds.route_share_min}\` - \`${payload.thresholds.route_share_max}\``,
    `- Fallback guardrail: \`fallback_rate <= ${payload.thresholds.fallback_rate_max}\``,
    '',
    '| Variant | Route Share | Fallback Rate | Quality Delta vs S1 | In Target Band | Gate Pass |',
    '|---|---:|---:|---:|---:|---:|',
  ];

  for (const row of payload.variants) {
    const routeShare = row.route_share === null ? 'N/A' : row.route_share.toFixed(4);
    const fallbackRate = row.fallback_rate === null ? 'N/A' : row.fallback_rate.toFixed(4);
    const qualityDelta = row.quality_delta === null ? 'N/A' : row.quality_delta.toFixed(6);
    lines.push(
      `| ${row.id} | ${routeShare} | ${fallbackRate} | ${qualityDelta} | ${
        row.route_share_in_target_band ? 'yes' : 'no'
      } | ${row.gate_pass ? 'yes' : 'no'} |`,
    );
  }

  lines.push('', '## Recommendation', '');
  if (payload.recommended_variant) {
    lines.push(
      `- recommended_variant: \`${payload.recommended_variant.id}\``,
      `- reason: \`${payload.recommended_variant_reason}\``,
    );
  } else {
    lines.push('- no recommendation; no variant met fallback/quality minimum gates');
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Math.max(1, Math.floor(toNumber(args.limit, DEFAULT_LIMIT)));
  const routeShareMin = toNumber(args.route_share_min, DEFAULT_ROUTE_SHARE_MIN);
  const routeShareMax = toNumber(args.route_share_max, DEFAULT_ROUTE_SHARE_MAX);
  const fallbackRateMax = toNumber(args.fallback_rate_max, DEFAULT_FALLBACK_RATE_MAX);
  const perCaseTimeoutMs = toNonNegativeInt(args['per-case-timeout-ms']);
  const roundTimeoutMs = toNonNegativeInt(args['round-timeout-ms']);
  const maxRetries = toNonNegativeInt(args['max-retries']);
  const s2TimeoutMs = toNonNegativeInt(args['s2-timeout-ms']);
  const variantFilter = parseVariantFilter(args.variants);

  ensureReadinessProfile();
  const profile = readJson(PROFILE_FILE) || {};
  const variants = deriveDepthVariants(profile).filter((variant) =>
    variantFilter ? variantFilter.has(variant.id) : true,
  );
  if (variants.length === 0) {
    throw new Error('No matching variants selected for route-share ramp experiment');
  }
  const results = [];

  for (const variant of variants) {
    process.stdout.write(`[ramp] start variant=${variant.id}\n`);
    const variantStartMs = Date.now();
    if (fs.existsSync(SUMMARY_FILE)) fs.rmSync(SUMMARY_FILE, { force: true });
    if (fs.existsSync(REPORT_FILE)) fs.rmSync(REPORT_FILE, { force: true });

    const env = {
      ...process.env,
      RAG_S2_READINESS_GUARD_ENABLED: 'true',
      RAG_S2_READINESS_PROFILE_PATH: toRel(PROFILE_FILE),
      RAG_S2_READINESS_MAX_TOPIC_DEPTH: String(variant.readiness_max_topic_depth),
      RAG_S2_READINESS_MAX_TOPIC_DEPTH_BY_SUBJECT: JSON.stringify(variant.readiness_max_topic_depth_by_subject || {}),
      RAG_S2_READINESS_ENFORCE_SUMMARY_COVERAGE: 'false',
    };

    const evalArgs = [EVAL_SCRIPT, '--limit', String(limit)];
    if (perCaseTimeoutMs !== null) evalArgs.push('--per-case-timeout-ms', String(perCaseTimeoutMs));
    if (roundTimeoutMs !== null) evalArgs.push('--round-timeout-ms', String(roundTimeoutMs));
    if (maxRetries !== null) evalArgs.push('--max-retries', String(maxRetries));
    if (s2TimeoutMs !== null) evalArgs.push('--s2-timeout-ms', String(s2TimeoutMs));

    const run = spawnSync(process.execPath, evalArgs, {
      cwd: ROOT,
      env,
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const summaryExists = fs.existsSync(SUMMARY_FILE);
    const summary = summaryExists ? readJson(SUMMARY_FILE) : null;
    const summaryMtimeMs = summaryExists ? fs.statSync(SUMMARY_FILE).mtimeMs : null;
    const summaryLimit = Number(summary?.run_config?.limit ?? summary?.run_config?.selected_cases ?? NaN);
    const summaryTotal = Number(summary?.total_requests ?? NaN);
    const summaryIsFresh = summaryMtimeMs !== null && summaryMtimeMs >= variantStartMs - 1_000;
    const summaryLimitMatches = Number.isFinite(summaryLimit) && summaryLimit === limit;
    const summaryTotalMatches = Number.isFinite(summaryTotal) && summaryTotal === limit;
    const summaryRoundComplete = summary?.run_config?.round_aborted !== true;
    const summaryValid =
      summaryExists && summaryIsFresh && summaryLimitMatches && summaryTotalMatches && summaryRoundComplete;

    const total = summaryValid ? Number(summary?.total_requests || 0) : 0;
    const s2Count = summaryValid ? Number(summary?.route_counts?.s2_augmentation || 0) : 0;
    const routeShare = summaryValid ? (total > 0 ? s2Count / total : 0) : null;
    const fallbackRate = summaryValid ? toNumber(summary?.fallback_rate, 1) : null;
    const qualityDelta = summaryValid ? toNumber(summary?.target_slice_quality_vs_s1, -1) : null;
    const routeShareInBand =
      routeShare !== null && routeShare >= routeShareMin && routeShare <= routeShareMax;
    const gatePass =
      fallbackRate !== null &&
      qualityDelta !== null &&
      fallbackRate <= fallbackRateMax &&
      qualityDelta > 0;

    const variantSummaryFile = path.join(
      ROOT,
      'runs',
      'backend',
      `rag_s2_augmentation_eval_summary.${variant.id}.json`,
    );
    const variantReportFile = path.join(
      ROOT,
      'docs',
      'reports',
      `rag_s2_augmentation_eval_report.${variant.id}.md`,
    );
    if (summaryValid) {
      copyArtifactIfExists(SUMMARY_FILE, variantSummaryFile);
      copyArtifactIfExists(REPORT_FILE, variantReportFile);
    }

    results.push({
      id: variant.id,
      description: variant.description,
      eval_success: run.status === 0,
      eval_exit_code: run.status ?? 1,
      summary_valid: summaryValid,
      summary_validation: {
        exists: summaryExists,
        fresh: summaryIsFresh,
        limit: Number.isFinite(summaryLimit) ? summaryLimit : null,
        limit_matches: summaryLimitMatches,
        total_requests: Number.isFinite(summaryTotal) ? summaryTotal : null,
        total_matches: summaryTotalMatches,
        round_complete: summaryRoundComplete,
      },
      eval_stdout_excerpt: truncateText(run.stdout || ''),
      eval_stderr_excerpt: truncateText(run.stderr || ''),
      route_share: routeShare === null ? null : Number(routeShare.toFixed(6)),
      s2_route_count: s2Count,
      total_requests: total,
      fallback_rate: fallbackRate === null ? null : Number(fallbackRate.toFixed(6)),
      quality_delta: qualityDelta === null ? null : Number(qualityDelta.toFixed(6)),
      route_share_in_target_band: routeShareInBand,
      gate_pass: gatePass,
      readiness_max_topic_depth: variant.readiness_max_topic_depth,
      readiness_max_topic_depth_by_subject: variant.readiness_max_topic_depth_by_subject,
      summary_artifact: summaryValid ? toRel(variantSummaryFile) : null,
      report_artifact: summaryValid ? toRel(variantReportFile) : null,
    });

    process.stdout.write(
      `[ramp] done variant=${variant.id} exit=${run.status ?? 1} summary_valid=${summaryValid} route_share=${
        routeShare === null ? 'n/a' : routeShare.toFixed(4)
      } fallback_rate=${fallbackRate === null ? 'n/a' : fallbackRate.toFixed(4)} quality_delta=${
        qualityDelta === null ? 'n/a' : qualityDelta.toFixed(6)
      }\n`,
    );
  }

  const recommended = pickRecommendation(results, {
    routeShareMin,
    routeShareMax,
    fallbackRateMax,
  });
  const recommendedReason = recommended
    ? recommended.route_share_in_target_band
      ? 'meets route-share target band and fallback/quality guardrails'
      : 'best available tradeoff under fallback/quality guardrails'
    : 'no candidate met minimum fallback/quality guardrails';

  const payload = {
    generated_at: new Date().toISOString(),
    stage: 'rag_s2_route_share_ramp_experiment',
    run_config: {
      script: 'scripts/rag/run_s2_route_share_ramp_experiment.js',
      limit,
      readiness_profile: toRel(PROFILE_FILE),
      per_case_timeout_ms: perCaseTimeoutMs,
      round_timeout_ms: roundTimeoutMs,
      max_retries: maxRetries,
      s2_timeout_ms: s2TimeoutMs,
      variants: variants.map((variant) => variant.id),
    },
    thresholds: {
      route_share_min: routeShareMin,
      route_share_max: routeShareMax,
      fallback_rate_max: fallbackRateMax,
      quality_delta_gt: 0,
    },
    variants: results,
    recommended_variant: recommended
      ? {
          id: recommended.id,
          route_share: recommended.route_share,
          fallback_rate: recommended.fallback_rate,
          quality_delta: recommended.quality_delta,
          summary_artifact: recommended.summary_artifact,
        }
      : null,
    recommended_variant_reason: recommendedReason,
    status: recommended ? 'pass' : 'warn',
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, renderReport(payload), 'utf8');
  process.stdout.write(`${toRel(OUT_JSON)}\n${toRel(OUT_MD)}\n`);

  if (!recommended) process.exit(1);
}

main();
