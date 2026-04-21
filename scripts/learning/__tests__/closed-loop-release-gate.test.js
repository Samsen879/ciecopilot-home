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

  test('gate proves the gold scenario and passes the released-scope repair guard', async () => {
    const { buildBrowserClosedLoopFixture } = await import('../lib/browser-closed-loop-fixture.js');
    const { buildClosedLoopReleaseGateReceipt } = await import('../lib/closed-loop-release-gate.js');

    const receipt = await buildClosedLoopReleaseGateReceipt({
      fixture: buildBrowserClosedLoopFixture(),
    });

    expect(receipt).toMatchObject({
      schema_version: 'learning_runtime_closed_loop_release_gate_receipt_v1',
      status: 'pass',
      release_ready: true,
      blocked_reasons: [],
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
      released_scope_repair_guard: {
        status: 'pass',
        release_scope_status: 'released_scoring',
        authoritative_scoring_allowed: true,
        fallback_reason_code: null,
        review_task_count: 1,
        first_review_task: expect.objectContaining({
          target_question_type_id: '9709.integration.application',
          success_criteria: expect.objectContaining({
            posture: 'released_scoring_repair',
            fallback_reason_code: null,
          }),
        }),
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
    const previousExitCode = process.exitCode;
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
      expect(process.exitCode).toBeUndefined();
      process.exitCode = undefined;

      expect(fs.existsSync(path.join(process.cwd(), outJson))).toBe(true);
      expect(fs.existsSync(path.join(process.cwd(), outMd))).toBe(true);

      const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), outJson), 'utf8'));
      const markdown = fs.readFileSync(path.join(process.cwd(), outMd), 'utf8');

      expect(payload).toMatchObject({
        schema_version: 'learning_runtime_closed_loop_release_gate_receipt_v1',
        status: 'pass',
        release_ready: true,
        blocked_reasons: [],
      });
      expect(markdown).toContain('# 9709 Closed-Loop Release Gate');
      expect(markdown).toContain('request_intake');
      expect(markdown).toContain('Released Scope Repair Guard');
      expect(markdown).toContain('scheduler_output');
      expect(markdown).toContain('Degraded Retry Debt');
      expect(markdown).toContain('learning_runtime_9709_enabled');
    } finally {
      process.exitCode = previousExitCode;
      fs.rmSync(path.join(process.cwd(), fixturePath), { force: true });
      fs.rmSync(path.join(process.cwd(), outJson), { force: true });
      fs.rmSync(path.join(process.cwd(), outMd), { force: true });
    }
  });

  test('explicit missing fixture path fails instead of falling back to synthetic data', async () => {
    const missingFixturePath = 'tmp/does-not-exist-closed-loop-fixture.json';
    const outJson = 'tmp/closed-loop-release-gate-missing-fixture.json';
    const outMd = 'tmp/closed-loop-release-gate-missing-fixture.md';
    const { writeClosedLoopReleaseGateOutputs } = await import('../lib/closed-loop-release-gate.js');

    try {
      await writeClosedLoopReleaseGateOutputs({
        fixturePath: missingFixturePath,
        outJsonPath: outJson,
        outMdPath: outMd,
      });

      expect(fs.existsSync(path.join(process.cwd(), outJson))).toBe(true);
      expect(fs.existsSync(path.join(process.cwd(), outMd))).toBe(true);

      const payload = JSON.parse(fs.readFileSync(path.join(process.cwd(), outJson), 'utf8'));
      const markdown = fs.readFileSync(path.join(process.cwd(), outMd), 'utf8');

      expect(payload).toMatchObject({
        schema_version: 'learning_runtime_closed_loop_release_gate_receipt_v1',
        status: 'fail',
        release_ready: false,
        blocked_reasons: ['fixture_missing'],
        feature_flags: {},
      });
      expect(payload.residual_risks).toEqual([
        expect.stringContaining(missingFixturePath),
      ]);
      expect(markdown).toContain('status: `fail`');
      expect(markdown).toContain(missingFixturePath);
    } finally {
      fs.rmSync(path.join(process.cwd(), outJson), { force: true });
      fs.rmSync(path.join(process.cwd(), outMd), { force: true });
    }
  });
});
