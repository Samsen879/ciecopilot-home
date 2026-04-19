import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PROJECT_ROOT = process.cwd();

function runCli(args = []) {
  return spawnSync(process.execPath, ['scripts/learning/run_9709_wave1_search_closure.js', ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });
}

describe('run_9709_wave1_search_closure cli', () => {
  test('treats a relative argv[1] as the active script when resolving the entrypoint guard', async () => {
    const module = await import('../run_9709_wave1_search_closure.js');
    const scriptPath = path.join('scripts', 'learning', 'run_9709_wave1_search_closure.js');
    const scriptUrl = pathToFileURL(path.join(PROJECT_ROOT, scriptPath)).href;

    expect(module.is9709Wave1SearchClosureEntrypoint(scriptPath, scriptUrl)).toBe(true);
  });

  test('prints usage for the documented closure entrypoint', () => {
    const result = runCli(['--help']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      `Usage: node ${path.join('scripts', 'learning', 'run_9709_wave1_search_closure.js')} [--manifest <path>] [--shard-id <id>] [--lane-results <path>] [--scope-from-lane-results|--scope-from-manifest] [--evidence-bundles-out <path>] [--fixture <path>] [--gate-report <path>] [--gate-json <path>] [--gate-psql-mode <direct|docker>] [--gate-psql-container <name>] [--dry-run]`,
    );
  });

  test('builds the default 9709 closure plan with a dockerized gate rerun', async () => {
    const module = await import('../run_9709_wave1_search_closure.js');

    const plan = module.build9709Wave1SearchClosurePlan();

    expect(plan).toHaveLength(4);
    expect(plan[0]).toMatchObject({
      label: 'build_evidence_bundles',
      command: process.execPath,
      args: [
        'scripts/learning/run_question_evidence_bundle_v1.js',
        '--manifest',
        'data/manifests/9709_question_search_recovery_v1.json',
        '--lane-results',
        'docs/reports/2026-04-16-9709-qwen-wave1-live-results-hotfix-rerun-v4.json',
        '--output',
        'docs/reports/2026-04-16-9709-question-evidence-bundles-v1.json',
      ],
    });
    expect(plan[1]).toMatchObject({
      label: 'backfill_paper_question_registry',
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        module.toWindowsWslUncPath(
          path.join(PROJECT_ROOT, 'scripts', 'learning', 'run_paper_question_registry_backfill_host.ps1'),
        ),
        '-Manifest',
        'data/manifests/9709_question_search_recovery_v1.json',
      ],
    });
    expect(plan[2]).toMatchObject({
      label: 'hydrate_question_analysis',
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        module.toWindowsWslUncPath(
          path.join(PROJECT_ROOT, 'scripts', 'learning', 'run_question_analysis_backfill_host.ps1'),
        ),
        '-Manifest',
        'data/manifests/9709_question_search_recovery_v1.json',
        '-EvidenceBundles',
        'docs/reports/2026-04-16-9709-question-evidence-bundles-v1.json',
      ],
    });
    expect(plan[3]).toMatchObject({
      label: 'rerun_question_search_gate',
      command: process.execPath,
    });
    expect(plan[3].args).toEqual([
      'scripts/evaluation/run_question_search_gate.js',
      '--fixture',
      'data/eval/question_search_gold_9709_v1.json',
      '--report',
      'docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun-report.md',
      '--json-out',
      'docs/reports/2026-04-16-9709-question-search-gate-hotfix-rerun.json',
      '--psql-mode',
      'docker',
    ]);
  });

  test('adds an explicit gate container override when provided', async () => {
    const module = await import('../run_9709_wave1_search_closure.js');

    const plan = module.build9709Wave1SearchClosurePlan({
      gatePsqlContainer: 'supabase_db_ciecopilot-home',
    });

    expect(plan[3].args).toEqual(expect.arrayContaining([
      '--psql-container',
      'supabase_db_ciecopilot-home',
    ]));
  });

  test('converts repo paths to Windows WSL UNC paths for host execution', async () => {
    const module = await import('../run_9709_wave1_search_closure.js');

    expect(
      module.toWindowsWslUncPath('/home/samsen/code/ciecopilot-home/scripts/learning/run_question_analysis_backfill_host.ps1'),
    ).toBe(
      '\\\\wsl.localhost\\Ubuntu\\home\\samsen\\code\\ciecopilot-home\\scripts\\learning\\run_question_analysis_backfill_host.ps1',
    );
  });

  test('dry-run prints explicit shard scope preview for lane-results authority', () => {
    const result = runCli([
      '--manifest',
      'data/manifests/9709_question_search_expansion_wave_a_v1.json',
      '--shard-id',
      'shard_1',
      '--lane-results',
      '/tmp/9709-wave-a-shard1-results.json',
      '--scope-from-lane-results',
      '--evidence-bundles-out',
      '/tmp/9709-wave-a-shard1-bundles.json',
      '--gate-report',
      '/tmp/9709-wave-a-shard1-gate.md',
      '--gate-json',
      '/tmp/9709-wave-a-shard1-gate.json',
      '--dry-run',
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('scope_mode: lane_results');
    expect(result.stdout).toContain('scope_source: /tmp/9709-wave-a-shard1-results.json');
    expect(result.stdout).toContain('target_row_count: 10');
    expect(result.stdout).toContain('cumulative_mode: false');
    expect(result.stdout).toContain('9709/s17_qp_11/questions/q03.png');
    expect(result.stdout).toContain('9709/s16_qp_32/questions/q03.png');
    expect(result.stdout).toContain('9709/m20_qp_32/questions/q05.png');
    expect(result.stdout).not.toContain('9709/m24_qp_12/questions/q04.png');
  });
});
