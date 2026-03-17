#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRagRequestTelemetryAudit,
  loadRagRequestTelemetryEvents,
} from './lib/telemetry_audit.js';

const ROOT = process.cwd();
const __filename = fileURLToPath(import.meta.url);
const DEFAULT_SOURCE_GLOB = 'runs/backend/telemetry/rag_request_events_*.jsonl';
const DEFAULT_OUT_JSON = 'runs/backend/rag_request_telemetry_audit_summary.json';
const DEFAULT_OUT_MD = 'docs/reports/rag_request_telemetry_audit_report.md';

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
    out[key] = value;
  }
  return out;
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === false) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function formatCountMap(map = {}) {
  const entries = Object.entries(map);
  if (entries.length === 0) return 'none';
  return entries.map(([key, count]) => `${key}: ${count}`).join(', ');
}

function formatRankedList(items = [], label = 'value') {
  if (!Array.isArray(items) || items.length === 0) return ['- none'];
  return items.map((item) => `- ${item[label]}: ${item.count}`);
}

function formatKnowledgeHoleGroups(groups = []) {
  if (!Array.isArray(groups) || groups.length === 0) return ['- none'];
  return groups.map(
    (group) =>
      `- ${group.subject_code || 'unknown'} ${group.current_topic_path || 'unknown'} ${group.endpoint || 'unknown'}: ${group.event_count} events, zero_hit=${group.zero_hit_count}, low_hit=${group.low_hit_count}, uncertain=${group.uncertain_count}`,
  );
}

function formatActions(actions = []) {
  if (!Array.isArray(actions) || actions.length === 0) return ['- none'];
  return actions.map(
    (action, index) =>
      `${index + 1}. [${action.action_type}] ${action.reason} target=${action.target_subject || 'n/a'} ${action.target_topic_path || 'n/a'}`,
  );
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveSourceGlobMatches(sourceGlob) {
  const resolved = resolveCliPath(sourceGlob);
  if (!resolved) return [];
  if (!resolved.includes('*')) {
    return fs.existsSync(resolved) ? [resolved] : [];
  }

  const directory = path.dirname(resolved);
  const pattern = path.basename(resolved);
  if (!fs.existsSync(directory)) return [];
  const regex = new RegExp(`^${escapeRegex(pattern).replace(/\\\*/g, '.*')}$`);
  return fs
    .readdirSync(directory)
    .filter((entry) => regex.test(entry))
    .sort((a, b) => a.localeCompare(b))
    .map((entry) => path.join(directory, entry));
}

export function resolveCliPath(inputPath) {
  if (!inputPath) return null;
  return path.isAbsolute(inputPath) ? inputPath : path.join(ROOT, inputPath);
}

export function renderRagRequestTelemetryAuditReport(summary = {}) {
  const lines = [
    '# RAG Request Telemetry Audit',
    '',
    `- total_requests: \`${summary.traffic_mix?.total_requests ?? 0}\``,
    `- success_count: \`${summary.traffic_mix?.success_count ?? 0}\``,
    `- failure_count: \`${summary.traffic_mix?.failure_count ?? 0}\``,
    '',
    '## Route Share',
    '',
    `- retrieval_routes: \`${formatCountMap(summary.route_mix?.retrieval_route_counts || {})}\``,
    `- final_execution_routes: \`${formatCountMap(summary.route_mix?.final_execution_route_counts || {})}\``,
    `- s2_fallback_count: \`${summary.route_mix?.s2_fallback_count ?? 0}\``,
    '',
    '## Fallback Reasons',
    '',
    ...formatRankedList(summary.fallback_clusters || [], 'reason'),
    '',
    '## Knowledge-Hole Groups',
    '',
    ...formatKnowledgeHoleGroups(summary.knowledge_hole_groups || []),
    '',
    '## Latency And Cost',
    '',
    `- latency_ms: \`p50=${summary.latency_cost?.latency_ms?.p50 ?? 0}, p90=${summary.latency_cost?.latency_ms?.p90 ?? 0}, p99=${summary.latency_cost?.latency_ms?.p99 ?? 0}\``,
    `- retrieval_latency_ms: \`p50=${summary.latency_cost?.retrieval_latency_ms?.p50 ?? 0}, p90=${summary.latency_cost?.retrieval_latency_ms?.p90 ?? 0}, p99=${summary.latency_cost?.retrieval_latency_ms?.p99 ?? 0}\``,
    `- llm_latency_ms: \`p50=${summary.latency_cost?.llm_latency_ms?.p50 ?? 0}, p90=${summary.latency_cost?.llm_latency_ms?.p90 ?? 0}, p99=${summary.latency_cost?.llm_latency_ms?.p99 ?? 0}\``,
    `- mean_request_cost_usd: \`${summary.latency_cost?.mean_request_cost_usd ?? 0}\``,
    `- highest_cost_route_bucket: \`${summary.latency_cost?.highest_cost_route_bucket?.route || 'none'}\``,
    `- highest_latency_route_bucket: \`${summary.latency_cost?.highest_latency_route_bucket?.route || 'none'}\``,
    '',
    '## Rollout Exposure',
    '',
    `- active_count: \`${summary.rollout_exposure?.active_count ?? 0}\``,
    `- by_subject: \`${formatCountMap(summary.rollout_exposure?.by_subject || {})}\``,
    ...formatRankedList(summary.rollout_exposure?.bundle_ids || [], 'value'),
    '',
    '## Top Recommended Actions',
    '',
    ...formatActions(summary.recommended_actions || []),
  ];

  return `${lines.join('\n')}\n`;
}

export function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv);
  const sourceGlob = cli['source-glob'] || DEFAULT_SOURCE_GLOB;
  const sourceFiles = resolveSourceGlobMatches(sourceGlob);
  if (sourceFiles.length === 0) {
    throw new Error(`no telemetry input files matched: ${sourceGlob}`);
  }

  const events = loadRagRequestTelemetryEvents(sourceFiles);
  const now = process.env.RAG_TELEMETRY_AUDIT_NOW
    ? new Date(process.env.RAG_TELEMETRY_AUDIT_NOW)
    : new Date();
  const summary = buildRagRequestTelemetryAudit({
    events,
    filters: {
      days: toNumberOrNull(cli.days),
      since: cli.since || null,
      until: cli.until || null,
      subject: cli.subject || null,
      endpoint: cli.endpoint || null,
    },
    now,
  });

  const outJson = resolveCliPath(cli['out-json'] || DEFAULT_OUT_JSON);
  const outMd = resolveCliPath(cli['out-md'] || DEFAULT_OUT_MD);
  const outActions = cli['out-actions'] ? resolveCliPath(cli['out-actions']) : null;

  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.mkdirSync(path.dirname(outMd), { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderRagRequestTelemetryAuditReport(summary), 'utf8');

  if (outActions) {
    fs.mkdirSync(path.dirname(outActions), { recursive: true });
    fs.writeFileSync(outActions, `${JSON.stringify(summary.recommended_actions, null, 2)}\n`, 'utf8');
  }

  process.stdout.write(`${toRel(outJson)}\n`);
  process.stdout.write(`${toRel(outMd)}\n`);
  if (outActions) process.stdout.write(`${toRel(outActions)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
