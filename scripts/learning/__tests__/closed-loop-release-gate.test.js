import fs from 'node:fs';
import path from 'node:path';

describe('closed loop release gate', () => {
  test('seed cli writes the reusable gold 9709 fixture', async () => {
    const { main } = await import('../seed_browser_closed_loop_fixture.js');
    const outPath = 'tmp/browser-closed-loop-fixture-test.json';

    try {
      main(['--out', outPath]);

      expect(fs.existsSync(path.join(process.cwd(), outPath))).toBe(true);

      const payload = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), outPath), 'utf8'),
      );

      expect(payload).toMatchObject({
        schema_version: 'learning_runtime_browser_closed_loop_fixture_v1',
        scenario_id: '9709.gold.closed_loop.release_gate.v1',
        subject_code: '9709',
        request_intake: {
          body: {
            subject_code: '9709',
            anchor_kind: 'question',
            anchor_ref: {
              kind: 'question',
              question_id: 'question-9709-trig-equations-gold',
            },
            current_question_id: 'question-9709-trig-equations-gold',
            current_question_type_id: '9709.trigonometry.equations',
          },
        },
        marking: {
          attempt_id: 'attempt-9709-closed-loop-gold',
          mark_run_id: 'mark-run-9709-closed-loop-gold',
        },
      });
    } finally {
      fs.rmSync(path.join(process.cwd(), outPath), { force: true });
    }
  });

  test('gate proves the gold scenario and records degraded retry debt explicitly', async () => {
    const { buildBrowserClosedLoopFixture } = await import('../lib/browser-closed-loop-fixture.js');
    const { buildClosedLoopReleaseGateReceipt } = await import('../lib/closed-loop-release-gate.js');

    const receipt = await buildClosedLoopReleaseGateReceipt({
      fixture: buildBrowserClosedLoopFixture(),
    });

    expect(receipt).toMatchObject({
      schema_version: 'learning_runtime_closed_loop_release_gate_receipt_v1',
      status: 'pass',
      release_ready: true,
      subject_code: '9709',
      feature_flags: {
        learning_runtime_enabled: true,
        learning_runtime_9709_enabled: true,
      },
      gates: {
        request_intake: {
          status: 'pass',
          session_id: expect.any(String),
          current_question_id: 'question-9709-trig-equations-gold',
          current_question_type_id: '9709.trigonometry.equations',
        },
        marking: {
          status: 'pass',
          release_scope_status: 'released_scoring',
          authoritative_scoring_allowed: true,
        },
        attempt_event_persistence: {
          status: 'pass',
          current_stage: 'LearningUpdateProposed',
          persisted_event_types: [
            'AttemptSubmitted',
            'QuestionClassified',
            'MarkingCompleted',
            'LearningUpdateProposed',
          ],
        },
        downstream_materialization: {
          status: 'pass',
          review_task_count: 1,
          artifact_count: 1,
        },
        scheduler_output: {
          status: 'pass',
          item_count: 1,
          first_item: expect.objectContaining({
            target_question_type_id: '9709.trigonometry.equations',
            status: 'open',
          }),
        },
        workspace_projection: {
          status: 'pass',
          slot_state: expect.objectContaining({
            common_traps: 'active',
            review_queue: 'active',
          }),
          common_traps: expect.objectContaining({
            primary_artifact_ref: {
              kind: 'artifact',
              artifact_id: expect.any(String),
            },
          }),
        },
      },
      degraded_path: {
        status: 'debt_recorded',
        retry_debt: {
          pending: true,
          failed_handlers: ['review_tasks'],
          receipt_summary: expect.objectContaining({
            retrying: 1,
          }),
        },
      },
    });

    expect(receipt.gates.workspace_projection.review_queue_linked_refs).toEqual([
      expect.objectContaining({
        kind: 'review_task',
      }),
    ]);
  });

  test('cli writes auditable json and markdown outputs', async () => {
    const fixturePath = 'tmp/browser-closed-loop-gold-fixture.json';
    const outJson = 'tmp/closed-loop-release-gate.json';
    const outMd = 'tmp/closed-loop-release-gate.md';
    const { main: seedMain } = await import('../seed_browser_closed_loop_fixture.js');
    const { main } = await import('../run_closed_loop_release_gate.js');

    try {
      seedMain(['--out', fixturePath]);
      await main([
        '--fixture',
        fixturePath,
        '--out-json',
        outJson,
        '--out-md',
        outMd,
      ]);

      expect(fs.existsSync(path.join(process.cwd(), outJson))).toBe(true);
      expect(fs.existsSync(path.join(process.cwd(), outMd))).toBe(true);

      const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), outJson), 'utf8'));
      const markdown = fs.readFileSync(path.join(process.cwd(), outMd), 'utf8');

      expect(payload).toMatchObject({
        schema_version: 'learning_runtime_closed_loop_release_gate_receipt_v1',
        status: 'pass',
        release_ready: true,
      });
      expect(markdown).toContain('# 9709 Closed-Loop Release Gate');
      expect(markdown).toContain('request_intake');
      expect(markdown).toContain('scheduler_output');
      expect(markdown).toContain('Degraded Retry Debt');
      expect(markdown).toContain('learning_runtime_9709_enabled');
    } finally {
      fs.rmSync(path.join(process.cwd(), fixturePath), { force: true });
      fs.rmSync(path.join(process.cwd(), outJson), { force: true });
      fs.rmSync(path.join(process.cwd(), outMd), { force: true });
    }
  });
});
