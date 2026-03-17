import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveCliPath } from '../run_telemetry_audit.js';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'rag', 'run_telemetry_audit.js');
const FIXTURE_REL_PATH = path.join(
  'scripts',
  'rag',
  '__tests__',
  'fixtures',
  'telemetry',
  'rag_request_events_fixture.jsonl',
);

function makeTempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rag-telemetry-audit-cli-'));
}

function copyIntoWorkspace(workspaceRoot, relPath) {
  const sourcePath = path.join(process.cwd(), relPath);
  const targetPath = path.join(workspaceRoot, relPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
    cwd: options.cwd,
    env: {
      ...process.env,
      ...(options.env || {}),
    },
    encoding: 'utf8',
  });
}

describe('run_telemetry_audit cli', () => {
  test('preserves absolute Windows paths instead of joining them onto ROOT', () => {
    const filePath = 'C:\\tmp\\rag_request_telemetry_audit_summary.json';
    expect(resolveCliPath(filePath)).toBe(filePath);
  });

  test('writes the default output paths and report sections when no explicit outputs are provided', () => {
    const workspaceRoot = makeTempWorkspace();
    copyIntoWorkspace(workspaceRoot, FIXTURE_REL_PATH);

    const result = runCli(
      ['--source-glob', 'scripts/rag/__tests__/fixtures/telemetry/*.jsonl'],
      {
        cwd: workspaceRoot,
        env: {
          RAG_TELEMETRY_AUDIT_NOW: '2026-03-17T23:59:59.000Z',
        },
      },
    );

    const outJson = path.join(workspaceRoot, 'runs/backend/rag_request_telemetry_audit_summary.json');
    const outMd = path.join(workspaceRoot, 'docs/reports/rag_request_telemetry_audit_report.md');

    expect(result.status).toBe(0);
    expect(fs.existsSync(outJson)).toBe(true);
    expect(fs.existsSync(outMd)).toBe(true);

    const summary = JSON.parse(fs.readFileSync(outJson, 'utf8'));
    const report = fs.readFileSync(outMd, 'utf8');
    expect(summary.recommended_actions.length).toBeGreaterThan(0);
    expect(report).toContain('## Route Share');
    expect(report).toContain('## Fallback Reasons');
    expect(report).toContain('## Knowledge-Hole Groups');
    expect(report).toContain('## Latency And Cost');
    expect(report).toContain('## Rollout Exposure');
    expect(report).toContain('## Top Recommended Actions');
  });

  test('writes an explicit action queue file when requested', () => {
    const workspaceRoot = makeTempWorkspace();
    copyIntoWorkspace(workspaceRoot, FIXTURE_REL_PATH);

    const result = runCli(
      [
        '--source-glob',
        'scripts/rag/__tests__/fixtures/telemetry/*.jsonl',
        '--out-json',
        'tmp/telemetry-summary.json',
        '--out-md',
        'tmp/telemetry-report.md',
        '--out-actions',
        'tmp/telemetry-actions.json',
      ],
      {
        cwd: workspaceRoot,
        env: {
          RAG_TELEMETRY_AUDIT_NOW: '2026-03-17T23:59:59.000Z',
        },
      },
    );

    const summary = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'tmp/telemetry-summary.json'), 'utf8'));
    const actions = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'tmp/telemetry-actions.json'), 'utf8'));

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(workspaceRoot, 'tmp/telemetry-report.md'))).toBe(true);
    expect(actions).toEqual(summary.recommended_actions);
  });

  test('filters by days, subject, and endpoint', () => {
    const workspaceRoot = makeTempWorkspace();
    copyIntoWorkspace(workspaceRoot, FIXTURE_REL_PATH);

    const result = runCli(
      [
        '--source-glob',
        'scripts/rag/__tests__/fixtures/telemetry/*.jsonl',
        '--days',
        '1',
        '--subject',
        '9231',
        '--endpoint',
        '/api/rag/search',
      ],
      {
        cwd: workspaceRoot,
        env: {
          RAG_TELEMETRY_AUDIT_NOW: '2026-03-17T23:59:59.000Z',
        },
      },
    );

    const summary = JSON.parse(
      fs.readFileSync(path.join(workspaceRoot, 'runs/backend/rag_request_telemetry_audit_summary.json'), 'utf8'),
    );

    expect(result.status).toBe(0);
    expect(summary.traffic_mix.total_requests).toBe(1);
    expect(summary.traffic_mix.failure_count).toBe(1);
    expect(summary.traffic_mix.subject_counts).toEqual({ '9231': 1 });
    expect(summary.traffic_mix.endpoint_counts).toEqual({ '/api/rag/search': 1 });
  });
});
