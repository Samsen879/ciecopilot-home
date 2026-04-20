import { pathToFileURL } from 'node:url';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();

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
    ],
  };
}

function buildThresholds() {
  return {
    projection_required_fields: [
      'question_id',
      'source_kind',
      'subject_code',
      'year',
      'session',
      'paper_number',
      'variant',
      'q_number',
      'summary',
      'search_text',
    ],
    current_shard_projection_completeness_required: 1,
    current_shard_queryability_required: 1,
    duplicate_projection_rows_max: 0,
  };
}

function buildProjectionRows() {
  return [
    {
      storage_key: '9709/s17_qp_11/questions/q03.png',
      question_id: 'question-1',
      source_kind: 'paper_question',
      subject_code: '9709',
      year: 2017,
      session: 's',
      paper_number: 1,
      variant: 1,
      q_number: 3,
      summary: 'Prove the trigonometric identity and solve.',
      search_text: 'Prove the trigonometric identity and solve the equation.',
    },
    {
      storage_key: '9709/s16_qp_32/questions/q03.png',
      question_id: 'question-2',
      source_kind: 'paper_question',
      subject_code: '9709',
      year: 2016,
      session: 's',
      paper_number: 3,
      variant: 2,
      q_number: 3,
      summary: 'Evaluate the definite integral exactly.',
      search_text: 'Evaluate the definite integral exactly using substitution.',
    },
  ];
}

describe('run_wave_a_projection_audit', () => {
  test('entrypoint guard accepts the repo-relative script path', async () => {
    const module = await import('../run_wave_a_projection_audit.js');
    const scriptPath = path.join('scripts', 'learning', 'run_wave_a_projection_audit.js');
    const scriptUrl = pathToFileURL(path.join(PROJECT_ROOT, scriptPath)).href;

    expect(module.isWaveAProjectionAuditEntrypoint(scriptPath, scriptUrl)).toBe(true);
  });

  test('buildWaveAProjectionAudit passes for exact-one projection rows with complete fields and queryability', async () => {
    const module = await import('../run_wave_a_projection_audit.js');

    const report = module.buildWaveAProjectionAudit({
      manifest: buildManifest(),
      shardId: 'shard_1',
      thresholds: buildThresholds(),
      projectionRows: buildProjectionRows(),
    });

    expect(report.pass).toBe(true);
    expect(report.summary).toMatchObject({
      target_row_count: 2,
      duplicate_projection_rows: 0,
      current_shard_projection_completeness: 1,
      current_shard_queryability: 1,
    });
  });

  test('buildWaveAProjectionAudit fails when duplicate projection rows exist for a target identity', async () => {
    const module = await import('../run_wave_a_projection_audit.js');
    const projectionRows = buildProjectionRows();
    projectionRows.push({ ...projectionRows[0], question_id: 'question-1b' });

    const report = module.buildWaveAProjectionAudit({
      manifest: buildManifest(),
      shardId: 'shard_1',
      thresholds: buildThresholds(),
      projectionRows,
    });

    expect(report.pass).toBe(false);
    expect(report.summary.duplicate_projection_rows).toBe(1);
    expect(report.failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'duplicate_projection_rows' }),
    ]));
  });

  test('buildWaveAProjectionAudit fails when required projection fields are missing', async () => {
    const module = await import('../run_wave_a_projection_audit.js');
    const projectionRows = buildProjectionRows().map((row) => ({ ...row }));
    projectionRows[1].summary = null;

    const report = module.buildWaveAProjectionAudit({
      manifest: buildManifest(),
      shardId: 'shard_1',
      thresholds: buildThresholds(),
      projectionRows,
    });

    expect(report.pass).toBe(false);
    expect(report.summary.current_shard_projection_completeness).toBe(0.5);
    expect(report.rows.find((row) => row.storage_key === '9709/s16_qp_32/questions/q03.png').missing_required_fields).toEqual(['summary']);
  });

  test('buildWaveAProjectionAudit fails when manifest paper does not map to projection paper_number or queryability is broken', async () => {
    const module = await import('../run_wave_a_projection_audit.js');
    const projectionRows = buildProjectionRows().map((row) => ({ ...row }));
    projectionRows[1].paper_number = 2;

    const report = module.buildWaveAProjectionAudit({
      manifest: buildManifest(),
      shardId: 'shard_1',
      thresholds: buildThresholds(),
      projectionRows,
    });

    expect(report.pass).toBe(false);
    expect(report.summary.current_shard_queryability).toBe(0.5);
    expect(report.failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'paper_number_mismatch' }),
      expect.objectContaining({ code: 'current_shard_queryability_failed' }),
    ]));
  });
});
