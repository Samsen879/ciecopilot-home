import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();

function runCli(args) {
  return spawnSync(
    process.execPath,
    ['scripts/learning/run_wave_a_shard_reset.js', ...args],
    {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    },
  );
}

function buildManifest() {
  return {
    manifest_id: '9709_question_search_expansion_wave_a_v1',
    items: [
      {
        storage_key: '9709/s17_qp_11/questions/q03.png',
        syllabus_code: '9709',
        year: 2017,
        session: 's',
        paper: 1,
        variant: 1,
        q_number: 3,
        primary_topic_path: '9709.p1.trigonometry',
        bucket: '9709.p1.trigonometry',
        difficulty_band: 'clean',
        shard_id: 'shard_1',
      },
      {
        storage_key: '9709/s16_qp_32/questions/q03.png',
        syllabus_code: '9709',
        year: 2016,
        session: 's',
        paper: 3,
        variant: 2,
        q_number: 3,
        primary_topic_path: '9709.p3.integration',
        bucket: '9709.p3.integration',
        difficulty_band: 'clean',
        shard_id: 'shard_1',
      },
      {
        storage_key: '9709/m24_qp_12/questions/q04.png',
        syllabus_code: '9709',
        year: 2024,
        session: 'm',
        paper: 1,
        variant: 2,
        q_number: 4,
        primary_topic_path: '9709.p1.trigonometry',
        bucket: '9709.p1.trigonometry',
        difficulty_band: 'clean',
        shard_id: 'shard_2',
      },
    ],
  };
}

describe('run_wave_a_shard_reset', () => {
  test('entrypoint guard accepts the repo-relative script path', async () => {
    const module = await import('../run_wave_a_shard_reset.js');
    const scriptPath = path.join('scripts', 'learning', 'run_wave_a_shard_reset.js');
    const scriptUrl = pathToFileURL(path.join(PROJECT_ROOT, scriptPath)).href;

    expect(module.isWaveAShardResetEntrypoint(scriptPath, scriptUrl)).toBe(true);
  });

  test('help prints the supported reset flags', () => {
    const result = runCli(['--help']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      `Usage: node ${path.join('scripts', 'learning', 'run_wave_a_shard_reset.js')} --manifest <path> --shard-id <id> [--scope-from-manifest] [--output-json <path>] [--dry-run]`,
    );
  });

  test('buildWaveAShardResetReport passes when only current-shard rows are removed and nothing remains', async () => {
    const module = await import('../run_wave_a_shard_reset.js');
    const report = module.buildWaveAShardResetReport({
      manifest: buildManifest(),
      shardId: 'shard_1',
      scopeMode: 'manifest',
      deletedStorageKeys: [
        '9709/s17_qp_11/questions/q03.png',
        '9709/s16_qp_32/questions/q03.png',
      ],
      preResetCounts: {
        question_bank: 2,
        learning_question_analysis_snapshots: 2,
        learning_question_events: 2,
      },
      deletedCounts: {
        question_bank: 2,
      },
      postResetCounts: {
        question_bank: 0,
        learning_question_analysis_snapshots: 0,
        learning_question_events: 0,
      },
    });

    expect(report.pass).toBe(true);
    expect(report.summary).toMatchObject({
      target_row_count: 2,
      deleted_question_bank_rows: 2,
      leftover_question_bank_rows: 0,
    });
  });

  test('buildWaveAShardResetReport fails on out-of-scope deletes', async () => {
    const module = await import('../run_wave_a_shard_reset.js');
    const report = module.buildWaveAShardResetReport({
      manifest: buildManifest(),
      shardId: 'shard_1',
      scopeMode: 'manifest',
      deletedStorageKeys: [
        '9709/s17_qp_11/questions/q03.png',
        '9709/m24_qp_12/questions/q04.png',
      ],
      preResetCounts: {
        question_bank: 2,
        learning_question_analysis_snapshots: 2,
        learning_question_events: 2,
      },
      deletedCounts: {
        question_bank: 2,
      },
      postResetCounts: {
        question_bank: 0,
        learning_question_analysis_snapshots: 0,
        learning_question_events: 0,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'out_of_scope_delete' }),
    ]));
  });

  test('buildWaveAShardResetReport fails on partial deletes', async () => {
    const module = await import('../run_wave_a_shard_reset.js');
    const report = module.buildWaveAShardResetReport({
      manifest: buildManifest(),
      shardId: 'shard_1',
      scopeMode: 'manifest',
      deletedStorageKeys: [
        '9709/s17_qp_11/questions/q03.png',
      ],
      preResetCounts: {
        question_bank: 2,
        learning_question_analysis_snapshots: 2,
        learning_question_events: 2,
      },
      deletedCounts: {
        question_bank: 1,
      },
      postResetCounts: {
        question_bank: 1,
        learning_question_analysis_snapshots: 1,
        learning_question_events: 1,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'partial_delete' }),
    ]));
  });

  test('buildWaveAShardResetReport fails when leftovers remain after delete', async () => {
    const module = await import('../run_wave_a_shard_reset.js');
    const report = module.buildWaveAShardResetReport({
      manifest: buildManifest(),
      shardId: 'shard_1',
      scopeMode: 'manifest',
      deletedStorageKeys: [
        '9709/s17_qp_11/questions/q03.png',
        '9709/s16_qp_32/questions/q03.png',
      ],
      preResetCounts: {
        question_bank: 2,
        learning_question_analysis_snapshots: 2,
        learning_question_events: 2,
      },
      deletedCounts: {
        question_bank: 2,
      },
      postResetCounts: {
        question_bank: 0,
        learning_question_analysis_snapshots: 1,
        learning_question_events: 0,
      },
    });

    expect(report.pass).toBe(false);
    expect(report.failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unresolved_leftovers' }),
    ]));
  });
});
