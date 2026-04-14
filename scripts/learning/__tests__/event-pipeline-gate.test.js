import fs from 'node:fs';
import path from 'node:path';

describe('event pipeline gate', () => {
  test('phase 0 gate passes when migration and in-memory pipeline invariants hold', async () => {
    const { buildEventPipelineGateReceipt } = await import('../lib/event-pipeline-gate.js');

    const result = buildEventPipelineGateReceipt({ rootDir: process.cwd() });

    expect(result).toMatchObject({
      status: 'pass',
      phase0_ready: true,
      gates: {
        migration_contract: { status: 'pass' },
        ordered_pipeline: { status: 'pass' },
        replay_revision: { status: 'pass' },
        dedupe_guard: { status: 'pass' },
        effect_idempotency: { status: 'pass' },
        attempt_stream_lock: { status: 'pass' },
      },
    });
    expect(result.schema_version).toBe('learning_runtime_event_pipeline_gate_receipt_v1');
    expect(result.gates.migration_contract.required_tokens).toContain(
      'unique (aggregate_id, truth_revision, sequence_no)',
    );
  });

  test('cli writes auditable json and markdown outputs', async () => {
    const { main } = await import('../run_event_pipeline_gate.js');
    const outJson = 'tmp/event-pipeline-gate-test.json';
    const outMd = 'tmp/event-pipeline-gate-test.md';

    try {
      main([
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
        schema_version: 'learning_runtime_event_pipeline_gate_receipt_v1',
        status: 'pass',
        phase0_ready: true,
      });
      expect(markdown).toContain('# Learning Event Pipeline Gate');
      expect(markdown).toContain('learning_events');
      expect(markdown).toContain('ordered_pipeline');
      expect(markdown).toContain('replay_revision');
      expect(markdown).toContain('effect_idempotency');
      expect(markdown).toContain('attempt_stream_lock');
    } finally {
      fs.rmSync(path.join(process.cwd(), outJson), { force: true });
      fs.rmSync(path.join(process.cwd(), outMd), { force: true });
    }
  });
});
